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

  it(
    "lets a customer choose manual verification and keeps that category after confirm",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, provider, country } = await stockedAccount(cleanup, stamp);
      const assigned = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      const slotId = assigned.body.data.request.assignedSlotId as string;
      const started = await request(app)
        .post(`/api/subscriptions/slots/${slotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ verification: "MANUAL" });
      expect(started.status).toBe(201);
      const paymentId = started.body.data.payment.id as string;
      expect(started.body.data.payment.verification).toBe("MANUAL");
      expect(started.body.data.payment.method).toBeNull();

      const hidden = await request(app)
        .get(`/api/subscriptions/slots/${slotId}/credentials`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`);
      expect(hidden.status).toBe(403);

      const noticesForAdmin = () =>
        prisma.notification.count({
          where: {
            recipientUserId: admin.id,
            paymentId,
            kind: "PAYMENT_TO_VERIFY",
          },
        });
      expect(await noticesForAdmin()).toBe(1);
      const again = await request(app)
        .post(`/api/subscriptions/slots/${slotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ verification: "MANUAL", method: "LUMICASH" });
      expect(again.body.data.payment.id).toBe(paymentId);
      expect(await noticesForAdmin()).toBe(1);

      const noted = await request(app)
        .put(`/api/subscriptions/payments/${paymentId}/confirmation`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ confirmationNote: "TX-100" });
      expect(noted.status).toBe(200);
      expect(await noticesForAdmin()).toBe(2);
      const edited = await request(app)
        .put(`/api/subscriptions/payments/${paymentId}/confirmation`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ confirmationNote: "TX-100 revised" });
      expect(edited.status).toBe(200);
      expect(await noticesForAdmin()).toBe(2);

      const waiting = await request(app)
        .get("/api/admin/payments/awaiting")
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(
        waiting.body.data.payments.some(
          (payment: { id: string; userEmail: string; holdEndsAt: string | null }) =>
            payment.id === paymentId &&
            payment.userEmail === `buyer-${stamp}@example.com` &&
            payment.holdEndsAt
        )
      ).toBe(true);

      const denied = await request(app)
        .post(`/api/admin/payments/${paymentId}/confirm`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`);
      expect(denied.status).toBe(403);

      const confirmed = await request(app)
        .post(`/api/admin/payments/${paymentId}/confirm`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.data.payment.verification).toBe("MANUAL");
      expect(confirmed.body.data.payment.status).toBe("PAID");
      const opened = await request(app)
        .get(`/api/subscriptions/slots/${slotId}/credentials`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`);
      expect(opened.status).toBe(200);
      const seated = await prisma.subscriptionSlot.findUnique({ where: { id: slotId } });
      const termEnd = seated?.termEndsAt?.toISOString();
      const second = await request(app)
        .post(`/api/admin/payments/${paymentId}/confirm`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(second.status).toBe(200);
      const still = await prisma.subscriptionSlot.findUnique({ where: { id: slotId } });
      expect(still?.termEndsAt?.toISOString()).toBe(termEnd);
    })
  );

  it(
    "replaces a manual payment with an online one, and refuses to replace an open Ihella charge",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { buyer, provider, country, subscription, currency } = await stockedAccount(
        cleanup,
        stamp
      );
      const assigned = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      const slotId = assigned.body.data.request.assignedSlotId as string;
      const manual = await request(app)
        .post(`/api/subscriptions/slots/${slotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ verification: "MANUAL" });
      const manualId = manual.body.data.payment.id as string;
      const online = await request(app)
        .post(`/api/subscriptions/slots/${slotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ verification: "ONLINE", method: "LUMICASH" });
      expect(online.status).toBe(201);
      expect(online.body.data.payment.verification).toBe("ONLINE");
      expect(online.body.data.payment.method).toBe("LUMICASH");
      const replaced = await prisma.payment.findUnique({ where: { id: manualId } });
      expect(replaced?.status).toBe("FAILED");

      const holder = await cleanup.getOrCreateTestUser(`ihella-${stamp}@example.com`);
      const openSlot = await prisma.subscriptionSlot.create({
        data: {
          userId: holder.id,
          subscriptionId: subscription.id,
          access: "AWAITING_PAYMENT",
          aliasLocalPart: `seatihella${stamp}`,
        },
      });
      cleanup.trackSubscriptionSlot(openSlot.id);
      const open = await prisma.payment.create({
        data: {
          userId: holder.id,
          slotId: openSlot.id,
          subscriptionId: subscription.id,
          amount: 25000,
          currencyId: currency.id,
          verification: "ONLINE",
          method: "IHELLA",
          providerRef: `open-${stamp}`,
        },
      });
      const blocked = await request(app)
        .post(`/api/subscriptions/slots/${openSlot.id}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(holder.id)}`)
        .send({ verification: "MANUAL" });
      expect(blocked.status).toBe(409);
      const untouched = await prisma.payment.findUnique({ where: { id: open.id } });
      expect(untouched?.status).toBe("PENDING");
    })
  );

  it(
    "holds a seat while a manual payment waits, then frees it after the admin rejects it",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, subscription } = await stockedAccount(cleanup, stamp);
      const slot = await prisma.subscriptionSlot.create({
        data: {
          userId: buyer.id,
          subscriptionId: subscription.id,
          access: "AWAITING_PAYMENT",
          aliasLocalPart: `seathold${stamp}`,
          assignedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        },
      });
      cleanup.trackSubscriptionSlot(slot.id);
      const started = await request(app)
        .post(`/api/subscriptions/slots/${slot.id}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ verification: "MANUAL" });
      const paymentId = started.body.data.payment.id as string;
      const sweep = new SlotAssignmentService(prisma);
      await sweep.sweepSeatTerms();
      const held = await prisma.subscriptionSlot.findUnique({ where: { id: slot.id } });
      expect(held?.isActive).toBe(true);

      const rejected = await request(app)
        .put(`/api/admin/payments/${paymentId}/fail`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(rejected.status).toBe(200);
      await sweep.sweepSeatTerms();
      const freed = await prisma.subscriptionSlot.findUnique({ where: { id: slot.id } });
      expect(freed?.isActive).toBe(false);
      const notices = await request(app)
        .get("/api/users/notifications")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`);
      expect(
        notices.body.data.notifications.some(
          (notice: { body: string }) =>
            notice.body === "Your payment was not confirmed. You can try again."
        )
      ).toBe(true);
    })
  );

  it(
    "does not confirm a manual payment after the seat was released",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, subscription, currency } = await stockedAccount(cleanup, stamp);
      const slot = await prisma.subscriptionSlot.create({
        data: {
          userId: buyer.id,
          subscriptionId: subscription.id,
          access: "AWAITING_PAYMENT",
          aliasLocalPart: `seatreleased${stamp}`,
          isActive: false,
          releasedAt: new Date(),
        },
      });
      cleanup.trackSubscriptionSlot(slot.id);
      const payment = await prisma.payment.create({
        data: {
          userId: buyer.id,
          slotId: slot.id,
          subscriptionId: subscription.id,
          amount: 25000,
          currencyId: currency.id,
          verification: "MANUAL",
          status: "PENDING",
        },
      });
      const confirmed = await request(app)
        .post(`/api/admin/payments/${payment.id}/confirm`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(confirmed.status).toBe(409);
      const pending = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(pending?.status).toBe("PENDING");
    })
  );

  it(
    "lists manual and online payments separately",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const { admin, buyer, provider, country, subscription } = await stockedAccount(
        cleanup,
        stamp
      );
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { maxSlots: 2 },
      });
      const other = await cleanup.getOrCreateTestUser(`other-${stamp}@example.com`);
      const first = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      const second = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(other.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      const manual = await request(app)
        .post(`/api/subscriptions/slots/${first.body.data.request.assignedSlotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(buyer.id)}`)
        .send({ verification: "MANUAL" });
      const online = await request(app)
        .post(`/api/subscriptions/slots/${second.body.data.request.assignedSlotId}/payments`)
        .set("Authorization", `Bearer ${signAccessToken(other.id)}`)
        .send({ method: "LUMICASH" });
      expect(online.body.data.payment.verification).toBe("ONLINE");
      const manualId = manual.body.data.payment.id as string;
      const onlineId = online.body.data.payment.id as string;

      const manualList = await request(app)
        .get("/api/admin/payments?verification=MANUAL")
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      const onlineList = await request(app)
        .get("/api/admin/payments?verification=ONLINE&status=PENDING")
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      const manualIds = manualList.body.data.payments.map((payment: { id: string }) => payment.id);
      const onlineIds = onlineList.body.data.payments.map((payment: { id: string }) => payment.id);
      expect(manualIds).toContain(manualId);
      expect(manualIds).not.toContain(onlineId);
      expect(onlineIds).toContain(onlineId);
      expect(onlineIds).not.toContain(manualId);

      const adminNotices = await prisma.notification.count({
        where: { recipientUserId: admin.id, paymentId: onlineId, kind: "PAYMENT_TO_VERIFY" },
      });
      expect(adminNotices).toBe(1);
      const confirmed = await request(app)
        .post(`/api/admin/payments/${onlineId}/confirm`)
        .set("Authorization", `Bearer ${signAccessToken(admin.id, "ADMIN")}`);
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.data.payment.verification).toBe("ONLINE");
      const opened = await request(app)
        .get(`/api/subscriptions/slots/${second.body.data.request.assignedSlotId}/credentials`)
        .set("Authorization", `Bearer ${signAccessToken(other.id)}`);
      expect(opened.status).toBe(200);
    })
  );
});
