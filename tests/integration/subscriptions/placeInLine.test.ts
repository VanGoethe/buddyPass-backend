import request from "supertest";
import App from "../../../src/app";
import { getPrismaClient } from "../../../src/config/database";
import { signAccessToken } from "../../utils/accessToken";
import { withTestCleanup } from "../../utils/testCleanup";
import { FUTURE_EXPIRES_AT, occupiedSlotData, subscriptionSecrets } from "../../utils/subscriptionFixture";

const app = new App().app;

describe("customer place in line", () => {
  it(
    "numbers pending requests in the order they arrived",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const country = await cleanup.getOrCreateTestCountry(`L${stamp.slice(-6)}`, "Line Country");
      const provider = await cleanup.getOrCreateTestServiceProvider(`Place Provider ${stamp}`);
      await getPrismaClient().serviceProviderCountry.create({
        data: { serviceProviderId: provider.id, countryId: country.id },
      });
      const holder = await cleanup.getOrCreateTestUser(`place-holder-${stamp}@example.com`);
      const subscription = await getPrismaClient().subscription.create({
        data: {
          serviceProviderId: provider.id,
          countryId: country.id,
          name: "Full",
          email: `place-${stamp}@example.com`,
          ...subscriptionSecrets(),
          maxSlots: 1,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(subscription.id);
      const slot = await getPrismaClient().subscriptionSlot.create({
        data: occupiedSlotData(holder.id, subscription.id),
      });
      cleanup.trackSubscriptionSlot(slot.id);

      const first = await cleanup.getOrCreateTestUser(`place-a-${stamp}@example.com`);
      const second = await cleanup.getOrCreateTestUser(`place-b-${stamp}@example.com`);

      const earlier = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(first.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      const later = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(second.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });

      expect(earlier.status).toBe(200);
      expect(earlier.body.data.request.place).toBe(1);
      expect(later.body.data.request.place).toBe(2);

      const mine = await request(app)
        .get("/api/subscriptions/requests")
        .set("Authorization", `Bearer ${signAccessToken(second.id)}`);
      expect(mine.body.data.requests[0].place).toBe(2);
    })
  );
});
