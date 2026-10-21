import { SlotAssignmentService } from "../../../src/services/subscriptions/slotAssignmentService";
import { getPrismaClient, disconnectDatabase } from "../../../src/config/database";
import { withTestCleanup } from "../../utils/testCleanup";
import {
  FUTURE_EXPIRES_AT,
  subscriptionSecrets,
} from "../../utils/subscriptionFixture";

describe("pending subscription queue", () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it(
    "assigns a pending request after the active slot is released",
    withTestCleanup(async (cleanup) => {
      const prisma = getPrismaClient();
      const service = new SlotAssignmentService(prisma);
      const stamp = Date.now();
      const holder = await cleanup.getOrCreateTestUser(
        `queue-holder-${stamp}@example.com`
      );
      const waiter = await cleanup.getOrCreateTestUser(
        `queue-waiter-${stamp}@example.com`
      );
      const country = await cleanup.getOrCreateTestCountry(
        `Q${stamp.toString().slice(-6)}`,
        "Queue Country"
      );
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Queue Provider ${stamp}`
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          countryId: country.id,
          name: "Queued Subscription",
          email: `queue-${stamp}@example.com`,
          ...subscriptionSecrets(),
          maxSlots: 1,
          needsCredentialReset: false,
          expiresAt: FUTURE_EXPIRES_AT,
          isActive: true,
        },
      });
      cleanup.trackSubscription(subscription.id);

      const slot = await prisma.subscriptionSlot.create({
        data: { userId: holder.id, subscriptionId: subscription.id },
      });
      cleanup.trackSubscriptionSlot(slot.id);

      const pending = await prisma.subscriptionRequest.create({
        data: {
          userId: waiter.id,
          serviceProviderId: provider.id,
          countryId: country.id,
          status: "PENDING",
        },
      });
      cleanup.trackSubscriptionRequest(pending.id);

      await prisma.subscriptionSlot.update({
        where: { id: slot.id },
        data: { isActive: false, releasedAt: new Date() },
      });

      const assignedCount = await service.processPending(provider.id, country.id);
      const updated = await prisma.subscriptionRequest.findUnique({
        where: { id: pending.id },
      });

      if (updated?.assignedSlotId) {
        cleanup.trackSubscriptionSlot(updated.assignedSlotId);
      }

      expect(assignedCount).toBe(1);
      expect(updated?.status).toBe("ASSIGNED");
      expect(updated?.assignedSlotId).toEqual(expect.any(String));
    })
  );
});
