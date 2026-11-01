import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { io, Socket } from "socket.io-client";
import request from "supertest";
import { getPrismaClient } from "../../../src/config/database";
import App from "../../../src/app";
import { container } from "../../../src/container";
import { withTestCleanup } from "../../utils/testCleanup";
import { signAccessToken } from "../../utils/accessToken";
import {
  FUTURE_EXPIRES_AT,
  subscriptionSecrets,
} from "../../utils/subscriptionFixture";

const expressApp = new App().app;
const prisma = getPrismaClient();

async function stockedAccount(
  cleanup: {
    getOrCreateTestUser: (email: string) => Promise<{ id: string }>;
    getOrCreateTestCountry: (code: string, name?: string) => Promise<{ id: string }>;
    getOrCreateTestServiceProvider: (name: string) => Promise<{ id: string }>;
    getOrCreateTestCurrency: (code: string, name?: string) => Promise<{ id: string }>;
    trackSubscription: (id: string) => void;
  },
  stamp: string
) {
  const admin = await cleanup.getOrCreateTestUser(`socket-admin-${stamp}@example.com`);
  await prisma.user.update({
    where: { id: admin.id },
    data: { role: "ADMIN", isVerified: true, isActive: true },
  });
  const buyer = await cleanup.getOrCreateTestUser(`socket-buyer-${stamp}@example.com`);
  const country = await cleanup.getOrCreateTestCountry(`S${stamp.slice(-6)}`, `Socket ${stamp}`);
  const provider = await cleanup.getOrCreateTestServiceProvider(`Socket Provider ${stamp}`);
  await prisma.serviceProviderCountry.create({
    data: { serviceProviderId: provider.id, countryId: country.id },
  });
  const currency = await cleanup.getOrCreateTestCurrency(`S${stamp.slice(-4)}`, `Socket ${stamp}`);
  const subscription = await prisma.subscription.create({
    data: {
      serviceProviderId: provider.id,
      countryId: country.id,
      currencyId: currency.id,
      name: "Netflix",
      email: `socket-${stamp}@example.com`,
      ...subscriptionSecrets("first-password"),
      maxSlots: 1,
      userPrice: 25000,
      accountCost: 120000,
      expiresAt: FUTURE_EXPIRES_AT,
    },
  });
  cleanup.trackSubscription(subscription.id);
  return { admin, buyer, country, provider };
}

function connect(port: number, token: string): Promise<Socket> {
  const socket = io(`http://127.0.0.1:${port}`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("socket connect timed out"));
    }, 5000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("connect_error", (error: Error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });
  });
}

function expectRejected(port: number, token: string): Promise<void> {
  const socket = io(`http://127.0.0.1:${port}`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("expected the socket to reject the token"));
    }, 5000);
    socket.once("connect_error", () => {
      clearTimeout(timer);
      socket.close();
      resolve();
    });
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.close();
      reject(new Error("socket connected with a rejected token"));
    });
  });
}

function nextNotification(socket: Socket): Promise<{ kind: string; urgent: boolean }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("notification timed out")), 5000);
    socket.once("notification", (payload: { kind: string; urgent: boolean }) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe("realtime notifications", () => {
  let server: HttpServer;
  let port: number;

  beforeAll(async () => {
    server = createServer(expressApp);
    container.getNotificationPublisher().attach(server);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address() as AddressInfo;
    port = address.port;
  });

  afterAll(async () => {
    await container.getNotificationPublisher().close();
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it(
    "pushes a manual payment to the admin once, then the confirmation to the customer",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, provider, country } = await stockedAccount(cleanup, stamp);
      const adminSocket = await connect(port, signAccessToken(admin.id, "ADMIN"));
      const buyerSocket = await connect(port, signAccessToken(buyer.id));
      try {
        const assigned = await request(expressApp)
          .post("/api/subscriptions/request")
          .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
          .send({ serviceProviderId: provider.id, countryId: country.id });
        const slotId = assigned.body.data.request.assignedSlotId as string;
        const adminNotice = nextNotification(adminSocket);
        const started = await request(expressApp)
          .post(`/api/subscriptions/slots/${slotId}/payments`)
          .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
          .send({ verification: "MANUAL" });
        expect(started.status).toBe(201);
        const pushed = await adminNotice;
        expect(pushed.kind).toBe("PAYMENT_TO_VERIFY");
        expect(pushed.urgent).toBe(true);

        let extra = 0;
        adminSocket.on("notification", () => {
          extra += 1;
        });
        const again = await request(expressApp)
          .post(`/api/subscriptions/slots/${slotId}/payments`)
          .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
          .send({ verification: "MANUAL" });
        expect(again.body.data.payment.id).toBe(started.body.data.payment.id);
        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(extra).toBe(0);

        const customerNotice = nextNotification(buyerSocket);
        const confirmed = await request(expressApp)
          .post(`/api/admin/payments/${started.body.data.payment.id as string}/confirm`)
          .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
        expect(confirmed.status).toBe(200);
        const opened = await customerNotice;
        expect(opened.kind).toBe("PAYMENT_CONFIRMATION");
        expect(opened.urgent).toBe(true);
      } finally {
        adminSocket.close();
        buyerSocket.close();
      }
    })
  );

  it("rejects a bad token and an inactive user", async () => {
    await expectRejected(port, "not-a-token");
    await withTestCleanup(async (cleanup) => {
      const user = await cleanup.getOrCreateTestUser(`socket-inactive-${Date.now()}@example.com`);
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });
      await expectRejected(port, signAccessToken(user.id));
    })();
  });
});
