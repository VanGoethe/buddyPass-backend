import { createHmac } from "crypto";
import request from "supertest";
import { getPrismaClient } from "../../../src/config/database";
import { SlotAssignmentService } from "../../../src/services/subscriptions/slotAssignmentService";
import App from "../../../src/app";
import { withTestCleanup } from "../../utils/testCleanup";
import { signAccessToken } from "../../utils/accessToken";
import {
  FUTURE_EXPIRES_AT,
  subscriptionSecrets,
} from "../../utils/subscriptionFixture";

const app = new App().app;
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
  const admin = await cleanup.getOrCreateTestUser(`admin-${stamp}@example.com`);
  await prisma.user.update({
    where: { id: admin.id },
    data: { role: "ADMIN", isVerified: true },
  });
  const buyer = await cleanup.getOrCreateTestUser(`buyer-${stamp}@example.com`);
  const country = await cleanup.getOrCreateTestCountry(`F${stamp.slice(-6)}`, `Feature ${stamp}`);
  const provider = await cleanup.getOrCreateTestServiceProvider(`Feature Provider ${stamp}`);
  await prisma.serviceProviderCountry.create({
    data: { serviceProviderId: provider.id, countryId: country.id },
  });
  const currency = await cleanup.getOrCreateTestCurrency(`F${stamp.slice(-4)}`, `Franc ${stamp}`);
  const subscription = await prisma.subscription.create({
    data: {
      serviceProviderId: provider.id,
      countryId: country.id,
      currencyId: currency.id,
      name: "Netflix",
      email: `netflix-${stamp}@example.com`,
      ...subscriptionSecrets("first-password"),
      maxSlots: 1,
      userPrice: 25000,
      accountCost: 120000,
      expiresAt: FUTURE_EXPIRES_AT,
    },
  });
  cleanup.trackSubscription(subscription.id);
  return { admin, buyer, country, provider, currency, subscription };
}

describe("admin feature loop", () => {
  it(
    "hides credentials until payment, then reveals the current password",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, provider, country, subscription } = await stockedAccount(
        cleanup,
        stamp
      );
      const assigned = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      expect(assigned.status).toBe(200);
      const slotId = assigned.body.data.request.assignedSlotId as string;
      expect(slotId).toBeTruthy();

      const hidden = await request(app)
        .get(`/api/subscriptions/slots/${slotId}/credentials`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`);
      expect(hidden.status).toBe(403);

      const adminReveal = await request(app)
        .get(`/api/subscriptions/slots/${slotId}/credentials`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(adminReveal.status).toBe(200);
      expect(adminReveal.body.data.password).toBe("first-password");
      expect(adminReveal.headers["cache-control"]).toBe("no-store");

      const rotated = await request(app)
        .put(`/api/subscriptions/${subscription.id}`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`)
        .send({ password: "second-password" });
      expect(rotated.status).toBe(200);

      const started = await request(app)
        .post(`/api/subscriptions/slots/${slotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ method: "LUMICASH" });
      expect(started.status).toBe(201);
      const paymentId = started.body.data.payment.id as string;
      const again = await request(app)
        .post(`/api/subscriptions/slots/${slotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ method: "LUMICASH" });
      expect(again.body.data.payment.id).toBe(paymentId);

      const confirmed = await request(app)
        .post(`/api/admin/payments/${paymentId}/confirm`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(confirmed.status).toBe(200);

      const opened = await request(app)
        .get(`/api/subscriptions/slots/${slotId}/credentials`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`);
      expect(opened.status).toBe(200);
      expect(opened.body.data.password).toBe("second-password");
      expect(opened.body.data.email).toBe(`netflix-${stamp}@example.com`);

      const reveals = await request(app)
        .get(`/api/admin/subscriptions/${subscription.id}/reveals`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(reveals.status).toBe(200);
      expect(reveals.body.data.reveals.length).toBeGreaterThanOrEqual(2);

      const notices = await request(app)
        .get("/api/users/notifications")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`);
      expect(notices.status).toBe(200);
      expect(
        notices.body.data.notifications.some(
          (notice: { kind: string }) => notice.kind === "PAYMENT_CONFIRMATION"
        )
      ).toBe(true);
    })
  );

  it(
    "verifies a user, lists the waiting line, and offers a price without the streaming email",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, provider, country, subscription } = await stockedAccount(
        cleanup,
        stamp
      );
      const unverified = await cleanup.getOrCreateTestUser(`local-${stamp}@example.com`);
      await prisma.user.update({
        where: { id: unverified.id },
        data: { isVerified: false },
      });
      const verified = await request(app)
        .put(`/api/admin/users/${unverified.id}/verification`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`)
        .send({ isVerified: true });
      expect(verified.status).toBe(200);
      expect(verified.body.data.user.isVerified).toBe(true);

      await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      const waitingUser = await cleanup.getOrCreateTestUser(`wait-${stamp}@example.com`);
      const queued = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(waitingUser.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      expect(queued.body.data.request.status).toBe("PENDING");

      const line = await request(app)
        .get("/api/admin/waiting-line")
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(line.status).toBe(200);
      expect(
        line.body.data.waiting.some(
          (entry: { userId: string; place: number }) =>
            entry.userId === waitingUser.id && entry.place === 1
        )
      ).toBe(true);

      const offers = await request(app).get("/api/offers");
      expect(offers.status).toBe(200);
      const body = JSON.stringify(offers.body);
      expect(body).not.toContain(`netflix-${stamp}@example.com`);
      expect(body).not.toContain("120000");
      expect(
        offers.body.data.offers.some(
          (offer: { serviceProviderId: string; price: string }) =>
            offer.serviceProviderId === provider.id && offer.price === "25000"
        )
      ).toBe(true);

      const dashboard = await request(app)
        .get("/api/admin/dashboard")
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(dashboard.status).toBe(200);
      expect(Array.isArray(dashboard.body.data.inventory)).toBe(true);
      expect(dashboard.body.data.waitingCount).toBeGreaterThanOrEqual(1);
      void subscription;
    })
  );

  it(
    "keeps seated people when the provider date passes, then blocks and frees an unpaid customer term",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, subscription } = await stockedAccount(cleanup, stamp);
      const slot = await prisma.subscriptionSlot.create({
        data: {
          userId: buyer.id,
          subscriptionId: subscription.id,
          access: "ACTIVE",
          aliasLocalPart: `seatkeep${stamp}`,
          termStartsAt: new Date("2026-10-01T00:00:00.000Z"),
          termEndsAt: new Date("2027-12-01T00:00:00.000Z"),
        },
      });
      cleanup.trackSubscriptionSlot(slot.id);
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
      const sweep = new SlotAssignmentService(prisma);
      await sweep.sweepSeatTerms();
      const kept = await prisma.subscriptionSlot.findUnique({ where: { id: slot.id } });
      expect(kept?.isActive).toBe(true);
      expect(kept?.access).toBe("ACTIVE");

      await prisma.subscriptionSlot.update({
        where: { id: slot.id },
        data: { termEndsAt: new Date(Date.now() - 60_000) },
      });
      await sweep.sweepSeatTerms();
      const blocked = await prisma.subscriptionSlot.findUnique({ where: { id: slot.id } });
      expect(blocked?.access).toBe("BLOCKED");
      expect(blocked?.isActive).toBe(true);

      const renewal = await request(app)
        .post(`/api/subscriptions/slots/${slot.id}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ method: "ENOTI" });
      expect(renewal.status).toBe(201);
      const renewed = await request(app)
        .post(`/api/admin/payments/${renewal.body.data.payment.id}/confirm`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(renewed.status).toBe(200);
      const keptSeat = await prisma.subscriptionSlot.findUnique({ where: { id: slot.id } });
      expect(keptSeat?.id).toBe(slot.id);
      expect(keptSeat?.access).toBe("ACTIVE");

      await prisma.subscriptionSlot.update({
        where: { id: slot.id },
        data: {
          access: "BLOCKED",
          blockedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          termEndsAt: new Date(Date.now() - 60_000),
        },
      });
      await sweep.sweepSeatTerms();
      const freed = await prisma.subscriptionSlot.findUnique({ where: { id: slot.id } });
      expect(freed?.isActive).toBe(false);
      expect(freed?.releasedAt).not.toBeNull();
    })
  );

  it(
    "seats a returning customer on the same account and reports an incident",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, provider, country, subscription } = await stockedAccount(
        cleanup,
        stamp
      );
      const first = await prisma.subscriptionSlot.create({
        data: {
          userId: buyer.id,
          subscriptionId: subscription.id,
          access: "ACTIVE",
          aliasLocalPart: `seatold${stamp}`,
          isActive: false,
          releasedAt: new Date(),
        },
      });
      cleanup.trackSubscriptionSlot(first.id);
      const again = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      expect(again.status).toBe(200);
      expect(again.body.data.request.assignedSlotId).not.toBe(first.id);

      const slotId = again.body.data.request.assignedSlotId as string;
      const reported = await request(app)
        .post(`/api/subscriptions/slots/${slotId}/incidents`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ note: "Login failed" });
      expect(reported.status).toBe(201);
      const resolved = await request(app)
        .put(`/api/admin/incidents/${reported.body.data.incident.id}`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`)
        .send({});
      expect(resolved.status).toBe(200);
      expect(resolved.body.data.incident.status).toBe("RESOLVED");
    })
  );

  it(
    "confirms an Ihella webhook once",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { buyer, subscription, currency } = await stockedAccount(cleanup, stamp);
      const slot = await prisma.subscriptionSlot.create({
        data: {
          userId: buyer.id,
          subscriptionId: subscription.id,
          access: "AWAITING_PAYMENT",
          aliasLocalPart: `seatpay${stamp}`,
        },
      });
      cleanup.trackSubscriptionSlot(slot.id);
      const providerRef = `ihella-${stamp}`;
      await prisma.payment.create({
        data: {
          userId: buyer.id,
          slotId: slot.id,
          subscriptionId: subscription.id,
          amount: 25000,
          currencyId: currency.id,
          method: "IHELLA",
          status: "PENDING",
          providerRef,
        },
      });
      const raw = JSON.stringify({ providerRef });
      const secret = process.env.IHELLA_WEBHOOK_SECRET ?? "test-webhook-secret";
      const signature = createHmac("sha256", secret).update(raw).digest("hex");
      const first = await request(app)
        .post("/api/payments/ihella/webhook")
        .set("Content-Type", "application/json")
        .set("x-ihella-signature", signature)
        .send(raw);
      expect(first.status).toBe(200);
      const second = await request(app)
        .post("/api/payments/ihella/webhook")
        .set("Content-Type", "application/json")
        .set("x-ihella-signature", signature)
        .send(raw);
      expect(second.status).toBe(200);
      const paid = await prisma.payment.count({
        where: { providerRef, status: "PAID" },
      });
      expect(paid).toBe(1);
      const renewed = await prisma.subscriptionSlot.findUnique({ where: { id: slot.id } });
      expect(renewed?.access).toBe("ACTIVE");
    })
  );
});
