import request from "supertest";
import { UserRole } from "@prisma/client";
import App from "../../src/app";
import { getPrismaClient } from "../../src/config/database";
import { withTestCleanup } from "../utils/testCleanup";
import { signAccessToken } from "../utils/accessToken";
import {
  FUTURE_EXPIRES_AT,
  subscriptionSecrets,
} from "../utils/subscriptionFixture";

const app = new App().app;
const prisma = getPrismaClient();

describe("authorization", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "rejects user writes on admin resources and another user's slot credentials",
    withTestCleanup(async (cleanup) => {
      const actor = await prisma.user.create({
        data: {
          email: `authz-actor-${Date.now()}@example.com`,
          name: "Authz Actor",
          password: "hashed-password",
          provider: "local",
          role: UserRole.USER,
          isVerified: true,
          isActive: true,
        },
      });
      cleanup.trackUser(actor.id);
      const owner = await prisma.user.create({
        data: {
          email: `authz-owner-${Date.now()}@example.com`,
          name: "Authz Owner",
          password: "hashed-password",
          provider: "local",
          role: UserRole.USER,
          isVerified: true,
          isActive: true,
        },
      });
      cleanup.trackUser(owner.id);

      const country = await cleanup.getOrCreateTestCountry(
        `Z${Date.now().toString().slice(-6)}`,
        "Authz Country"
      );
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Authz Provider ${Date.now()}`
      );
      const currency = await cleanup.getOrCreateTestCurrency(
        `Z${Date.now().toString().slice(-5)}`,
        "Authz Currency"
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          countryId: country.id,
          name: "Authz Subscription",
          email: `authz-sub-${Date.now()}@example.com`,
          ...subscriptionSecrets("OwnerSecret1"),
          maxSlots: 1,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(subscription.id);
      const slot = await prisma.subscriptionSlot.create({
        data: { userId: owner.id, subscriptionId: subscription.id },
      });
      cleanup.trackSubscriptionSlot(slot.id);

      const token = signAccessToken(actor.id, "USER");
      const auth = { Authorization: `Bearer ${token}` };

      const forbidden = [
        request(app).post("/api/subscriptions").set(auth).send({}),
        request(app).put(`/api/subscriptions/${subscription.id}`).set(auth).send({}),
        request(app).delete(`/api/subscriptions/${subscription.id}`).set(auth),
        request(app).get("/api/subscriptions").set(auth),
        request(app).post("/api/service-providers").set(auth).send({}),
        request(app).put(`/api/service-providers/${provider.id}`).set(auth).send({}),
        request(app).delete(`/api/service-providers/${provider.id}`).set(auth),
        request(app).post("/api/countries").set(auth).send({}),
        request(app).put(`/api/countries/${country.id}`).set(auth).send({}),
        request(app).delete(`/api/countries/${country.id}`).set(auth),
        request(app).post("/api/currencies").set(auth).send({}),
        request(app).put(`/api/currencies/${currency.id}`).set(auth).send({}),
        request(app).delete(`/api/currencies/${currency.id}`).set(auth),
      ];

      const responses = await Promise.all(forbidden);
      for (const response of responses) {
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe("ADMIN_REQUIRED");
      }

      const credentials = await request(app)
        .get(`/api/subscriptions/slots/${slot.id}/credentials`)
        .set(auth);

      expect(credentials.status).toBe(403);
      expect(credentials.body.success).toBe(false);
    })
  );
});
