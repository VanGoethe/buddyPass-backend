import request from "supertest";
import { getPrismaClient } from "../../src/config/database";
import App from "../../src/app";
import { withTestCleanup } from "../utils/testCleanup";
import { signAccessToken } from "../utils/accessToken";
import {
  FUTURE_EXPIRES_AT,
  subscriptionSecrets,
} from "../utils/subscriptionFixture";

const app = new App().app;
const prisma = getPrismaClient();

describe("Subscription Assignment API", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/subscriptions/request", () => {
    it(
      "assigns a slot when capacity remains",
      withTestCleanup(async (cleanup) => {
        const user = await cleanup.getOrCreateTestUser(
          `slotapi-${Date.now()}@example.com`
        );
        const country = await cleanup.getOrCreateTestCountry(
          `A${Date.now().toString().slice(-6)}`,
          "Assignment Country"
        );
        const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
          `API Test Provider ${Date.now()}`
        );
        await prisma.serviceProviderCountry.create({
          data: {
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
          },
        });
        const subscription = await prisma.subscription.create({
          data: {
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
            name: "API Test Subscription",
            email: `api-${Date.now()}@example.com`,
            ...subscriptionSecrets(),
            maxSlots: 5,
            expiresAt: FUTURE_EXPIRES_AT,
          },
        });
        cleanup.trackSubscription(subscription.id);

        const response = await request(app)
          .post("/api/subscriptions/request")
          .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
          .send({
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
          });

        if (response.body.data?.request?.id) {
          cleanup.trackSubscriptionRequest(response.body.data.request.id);
        }
        if (response.body.data?.request?.assignedSlotId) {
          cleanup.trackSubscriptionSlot(response.body.data.request.assignedSlotId);
        }

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.request.status).toBe("ASSIGNED");
      })
    );

    it(
      "creates a pending request when the only slot is taken",
      withTestCleanup(async (cleanup) => {
        const holder = await cleanup.getOrCreateTestUser(
          `holder-${Date.now()}@example.com`
        );
        const user = await cleanup.getOrCreateTestUser(
          `pending-${Date.now()}@example.com`
        );
        const country = await cleanup.getOrCreateTestCountry(
          `P${Date.now().toString().slice(-6)}`,
          "Pending Country"
        );
        const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
          `Full Provider ${Date.now()}`
        );
        await prisma.serviceProviderCountry.create({
          data: {
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
          },
        });
        const subscription = await prisma.subscription.create({
          data: {
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
            name: "Full Subscription",
            email: `full-${Date.now()}@example.com`,
            ...subscriptionSecrets(),
            maxSlots: 1,
            expiresAt: FUTURE_EXPIRES_AT,
          },
        });
        cleanup.trackSubscription(subscription.id);
        const slot = await prisma.subscriptionSlot.create({
          data: { userId: holder.id, subscriptionId: subscription.id },
        });
        cleanup.trackSubscriptionSlot(slot.id);

        const response = await request(app)
          .post("/api/subscriptions/request")
          .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
          .send({
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
          });

        if (response.body.data?.request?.id) {
          cleanup.trackSubscriptionRequest(response.body.data.request.id);
        }

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.request.status).toBe("PENDING");
      })
    );

    it(
      "returns 400 when the service provider id is missing",
      withTestCleanup(async (cleanup) => {
        const user = await cleanup.getOrCreateTestUser(
          `validation-${Date.now()}@example.com`
        );

        const response = await request(app)
          .post("/api/subscriptions/request")
          .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      })
    );

    it("returns 401 when authorization is missing", async () => {
      const response = await request(app)
        .post("/api/subscriptions/request")
        .send({ serviceProviderId: "test-id" });

      expect(response.status).toBe(401);
    });

    it(
      "returns 409 when the user already has an active slot",
      withTestCleanup(async (cleanup) => {
        const user = await cleanup.getOrCreateTestUser(
          `duplicate-api-${Date.now()}@example.com`
        );
        const country = await cleanup.getOrCreateTestCountry(
          `U${Date.now().toString().slice(-6)}`,
          "Duplicate API Country"
        );
        const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
          `Duplicate API Provider ${Date.now()}`
        );
        await prisma.serviceProviderCountry.create({
          data: {
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
          },
        });
        const subscription = await prisma.subscription.create({
          data: {
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
            name: "Duplicate Test Subscription",
            email: `duplicate-api-${Date.now()}@example.com`,
            ...subscriptionSecrets(),
            maxSlots: 5,
            expiresAt: FUTURE_EXPIRES_AT,
          },
        });
        cleanup.trackSubscription(subscription.id);
        const slot = await prisma.subscriptionSlot.create({
          data: { userId: user.id, subscriptionId: subscription.id },
        });
        cleanup.trackSubscriptionSlot(slot.id);

        const response = await request(app)
          .post("/api/subscriptions/request")
          .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
          .send({
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
          });

        if (response.body.data?.request?.id) {
          cleanup.trackSubscriptionRequest(response.body.data.request.id);
        }

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("DUPLICATE_REQUEST");
      })
    );
  });

  describe("GET /api/subscriptions/my-slots", () => {
    it(
      "returns the user's subscription slots",
      withTestCleanup(async (cleanup) => {
        const user = await cleanup.getOrCreateTestUser(
          `myslots-${Date.now()}@example.com`
        );
        const country = await cleanup.getOrCreateTestCountry(
          `M${Date.now().toString().slice(-6)}`,
          "My Slots Country"
        );
        const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
          `My Slots Provider ${Date.now()}`
        );
        const subscription = await prisma.subscription.create({
          data: {
            serviceProviderId: serviceProvider.id,
            countryId: country.id,
            name: "My Slots Subscription",
            email: `myslots-${Date.now()}@example.com`,
            ...subscriptionSecrets(),
            maxSlots: 5,
            expiresAt: FUTURE_EXPIRES_AT,
          },
        });
        cleanup.trackSubscription(subscription.id);
        const slot = await prisma.subscriptionSlot.create({
          data: { userId: user.id, subscriptionId: subscription.id },
        });
        cleanup.trackSubscriptionSlot(slot.id);

        const response = await request(app)
          .get("/api/subscriptions/my-slots")
          .set("Authorization", `Bearer ${signAccessToken(user.id)}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.slots).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ subscriptionId: subscription.id }),
          ])
        );
      })
    );

    it("returns 401 when authorization is missing", async () => {
      const response = await request(app).get("/api/subscriptions/my-slots");

      expect(response.status).toBe(401);
    });
  });
});
