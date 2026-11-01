import request from "supertest";
import { UserRole } from "@prisma/client";
import App from "../../src/app";
import { getPrismaClient } from "../../src/config/database";
import { withTestCleanup } from "../utils/testCleanup";
import { signAccessToken } from "../utils/accessToken";
import { subscriptionSecrets } from "../utils/subscriptionFixture";

const app = new App().app;
const prisma = getPrismaClient();

describe("login code routes", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "rejects an unpaid code request, an unconfigured inbox, and a non-admin",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const user = await prisma.user.create({
        data: {
          email: `code-user-${stamp}@example.com`,
          name: "Code User",
          password: "hashed-password",
          provider: "local",
          role: UserRole.USER,
          isVerified: true,
          isActive: true,
        },
      });
      cleanup.trackUser(user.id);
      const country = await cleanup.getOrCreateTestCountry(`C${stamp.slice(-6)}`, "Code Country");
      const provider = await cleanup.getOrCreateTestServiceProvider(`Code Provider ${stamp}`);
      const currency = await cleanup.getOrCreateTestCurrency(`C${stamp.slice(-5)}`, "Code Currency");
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          countryId: country.id,
          currencyId: currency.id,
          name: "Code Subscription",
          email: `code-sub-${stamp}@example.com`,
          ...subscriptionSecrets("OwnerSecret1"),
          maxSlots: 1,
          userPrice: 25000,
        },
      });
      cleanup.trackSubscription(subscription.id);
      const slot = await prisma.subscriptionSlot.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          access: "AWAITING_PAYMENT",
          aliasLocalPart: `seatcode${stamp}`,
        },
      });
      cleanup.trackSubscriptionSlot(slot.id);

      const token = signAccessToken(user.id, "USER");
      const auth = { Authorization: `Bearer ${token}` };
      const denied = await request(app)
        .post(`/api/subscriptions/slots/${slot.id}/login-code/request`)
        .set(auth)
        .send({});
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe("PAYMENT_REQUIRED");

      const helpDenied = await request(app)
        .post(`/api/subscriptions/slots/${slot.id}/login-code/help`)
        .set(auth)
        .send({});
      expect(helpDenied.status).toBe(403);

      await prisma.subscriptionSlot.update({
        where: { id: slot.id },
        data: {
          access: "ACTIVE",
          termStartsAt: new Date("2026-10-01T00:00:00.000Z"),
          termEndsAt: new Date("2027-12-01T00:00:00.000Z"),
        },
      });
      await prisma.payment.create({
        data: {
          userId: user.id,
          slotId: slot.id,
          subscriptionId: subscription.id,
          amount: 25000,
          currencyId: currency.id,
          verification: "MANUAL",
          status: "PAID",
          paidAt: new Date("2026-10-01T00:00:00.000Z"),
        },
      });

      const unavailable = await request(app)
        .post(`/api/subscriptions/slots/${slot.id}/login-code/request`)
        .set(auth)
        .send({});
      expect(unavailable.status).toBe(503);
      expect(unavailable.body.error.code).toBe("INBOX_UNAVAILABLE");

      const adminOnly = await request(app)
        .get("/api/admin/login-code-help")
        .set(auth);
      expect(adminOnly.status).toBe(403);
    })
  );
});
