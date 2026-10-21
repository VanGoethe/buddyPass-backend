import { getPrismaClient } from "../../../src/config/database";
import { SlotAssignmentService } from "../../../src/services/subscriptions/slotAssignmentService";
import { credentialCipher } from "../../../src/utils/credentialCipher";
import { withTestCleanup } from "../../utils/testCleanup";

const prisma = getPrismaClient();

describe("slot allocation", () => {
  it(
    "assigns exactly one of ten concurrent requests when one seat remains",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now();
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Race Provider ${stamp}`
      );
      const encrypted = credentialCipher.encrypt("race-pass");
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          name: "Race sub",
          email: `race-${stamp}@streams.test`,
          ...encrypted,
          needsCredentialReset: false,
          maxSlots: 1,
          expiresAt: new Date("2027-12-31"),
        },
      });
      cleanup.trackSubscription(subscription.id);

      const users = await Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          cleanup.getOrCreateTestUser(`race-${stamp}-${index}@example.com`)
        )
      );

      const service = new SlotAssignmentService(prisma);
      const results = await Promise.all(
        users.map((user) =>
          service.assignSlotToUser(user.id, provider.id, null)
        )
      );

      const winners = results.filter((result) => result.success);
      const active = await prisma.subscriptionSlot.count({
        where: {
          subscriptionId: subscription.id,
          isActive: true,
          releasedAt: null,
        },
      });

      expect(winners).toHaveLength(1);
      expect(active).toBe(1);
      for (const slot of winners) {
        if (slot.slotAssignment) {
          cleanup.trackSubscriptionSlot(slot.slotAssignment.id);
        }
      }
    })
  );

  it(
    "fills a pending request when a slot is released",
    withTestCleanup(async (cleanup) => {
      const stamp = Date.now();
      const holder = await cleanup.getOrCreateTestUser(
        `holder-${stamp}@example.com`
      );
      const waiter = await cleanup.getOrCreateTestUser(
        `waiter-${stamp}@example.com`
      );
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Queue Provider ${stamp}`
      );
      const encrypted = credentialCipher.encrypt("queue-pass");
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          name: "Queue sub",
          email: `queue-${stamp}@streams.test`,
          ...encrypted,
          needsCredentialReset: false,
          maxSlots: 1,
          expiresAt: new Date("2027-12-31"),
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
          status: "PENDING",
        },
      });
      cleanup.trackSubscriptionRequest(pending.id);

      await prisma.subscriptionSlot.update({
        where: { id: slot.id },
        data: { isActive: false, releasedAt: new Date() },
      });

      const service = new SlotAssignmentService(prisma);
      const assigned = await service.processPending(provider.id, null);

      const updated = await prisma.subscriptionRequest.findUnique({
        where: { id: pending.id },
      });

      expect(assigned).toBe(1);
      expect(updated?.status).toBe("ASSIGNED");
      expect(updated?.assignedSlotId).toBeTruthy();
      if (updated?.assignedSlotId) {
        cleanup.trackSubscriptionSlot(updated.assignedSlotId);
      }
    })
  );
});
