import request from "supertest";
import App from "../../../src/app";
import { getPrismaClient } from "../../../src/config/database";
import { signAccessToken } from "../../utils/accessToken";
import { withTestCleanup } from "../../utils/testCleanup";
import { FUTURE_EXPIRES_AT, occupiedSlotData, subscriptionSecrets } from "../../utils/subscriptionFixture";

const app = new App().app;

describe("cancel a pending request", () => {
  it(
    "cancels the caller's pending request and refreshes capacity",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now().toString();
      const country = await cleanup.getOrCreateTestCountry(`C${stamp.slice(-6)}`, "Cancel Country");
      const provider = await cleanup.getOrCreateTestServiceProvider(`Cancel Provider ${stamp}`);
      await getPrismaClient().serviceProviderCountry.create({
        data: { serviceProviderId: provider.id, countryId: country.id },
      });
      const holder = await cleanup.getOrCreateTestUser(`cancel-holder-${stamp}@example.com`);
      const subscription = await getPrismaClient().subscription.create({
        data: {
          serviceProviderId: provider.id,
          countryId: country.id,
          name: "Full",
          email: `cancel-${stamp}@example.com`,
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

      const user = await cleanup.getOrCreateTestUser(`cancel-${stamp}@example.com`);
      const other = await cleanup.getOrCreateTestUser(`other-${stamp}@example.com`);

      const created = await request(app)
        .post("/api/subscriptions/request")
        .set("Authorization", `Bearer ${signAccessToken(user.id)}`)
        .send({ serviceProviderId: provider.id, countryId: country.id });
      const requestId = created.body.data.request.id as string;
      expect(created.body.data.request.status).toBe("PENDING");

      const stranger = await request(app)
        .delete(`/api/subscriptions/requests/${requestId}`)
        .set("Authorization", `Bearer ${signAccessToken(other.id)}`);
      expect(stranger.status).toBe(404);

      const cancelled = await request(app)
        .delete(`/api/subscriptions/requests/${requestId}`)
        .set("Authorization", `Bearer ${signAccessToken(user.id)}`);
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.data.request.status).toBe("CANCELLED");

      const again = await request(app)
        .delete(`/api/subscriptions/requests/${requestId}`)
        .set("Authorization", `Bearer ${signAccessToken(user.id)}`);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe("REQUEST_NOT_PENDING");

      const alert = await getPrismaClient().capacityAlert.findFirst({
        where: { serviceProviderId: provider.id, countryId: country.id },
        orderBy: { updatedAt: "desc" },
      });
      expect(alert?.pendingCount).toBe(0);
    })
  );
});
