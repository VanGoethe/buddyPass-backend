import { SlotAssignmentService } from "../../../src/services/subscriptions/slotAssignmentService";
import { getPrismaClient, disconnectDatabase } from "../../../src/config/database";
import { withTestCleanup } from "../../utils/testCleanup";
import {
  FUTURE_EXPIRES_AT,
  subscriptionSecrets,
} from "../../utils/subscriptionFixture";

describe("slot assignment concurrency", () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it(
    "assigns the single slot to exactly one of ten concurrent users",
    withTestCleanup(async (cleanup) => {
      const prisma = getPrismaClient();
      const service = new SlotAssignmentService(prisma);
      const stamp = Date.now();
      const country = await cleanup.getOrCreateTestCountry(
        `C${stamp.toString().slice(-6)}`,
        "Concurrency Country"
      );
      const provider = await cleanup.getOrCreateTestServiceProvider(
        `Concurrency Provider ${stamp}`
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: provider.id,
          countryId: country.id,
          name: "Single Slot",
          email: `concurrency-${stamp}@example.com`,
          ...subscriptionSecrets(),
          maxSlots: 1,
          needsCredentialReset: false,
          expiresAt: FUTURE_EXPIRES_AT,
          isActive: true,
        },
      });
      cleanup.trackSubscription(subscription.id);

      const users = await Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          cleanup.getOrCreateTestUser(`slot-race-${stamp}-${index}@example.com`)
        )
      );

      const results = await Promise.all(
        users.map((user) =>
          service.assignSlotToUser(user.id, provider.id, country.id)
        )
      );

      for (const result of results) {
        if (result.slotAssignment) {
          cleanup.trackSubscriptionSlot(result.slotAssignment.id);
        }
      }

      expect(results.filter((result) => result.success)).toHaveLength(1);
    })
  );
});
