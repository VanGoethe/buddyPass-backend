import { PrismaClient } from "@prisma/client";
import {
  PrismaSubscriptionRequestRepository,
  PrismaSubscriptionSlotRepository,
} from "../../../src/repositories/subscriptions";
import { SubscriptionRequestStatus } from "../../../src/types/subscriptions";
import { withTestCleanup, TestDataCleanup } from "../../utils/testCleanup";
import {
  FUTURE_EXPIRES_AT,
  subscriptionSecrets,
} from "../../utils/subscriptionFixture";

const prisma = new PrismaClient();

describe("Subscription Slot Repository Integration", () => {
  let slotRepository: PrismaSubscriptionSlotRepository;
  let requestRepository: PrismaSubscriptionRequestRepository;

  beforeAll(() => {
    slotRepository = new PrismaSubscriptionSlotRepository(prisma);
    requestRepository = new PrismaSubscriptionRequestRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "creates and finds subscription slots",
    withTestCleanup(async (cleanup: TestDataCleanup) => {
      const user = await cleanup.getOrCreateTestUser(
        `slottest-${Date.now()}@example.com`
      );
      const country = await cleanup.getOrCreateTestCountry(
        `S${Date.now().toString().slice(-6)}`,
        "Slot Test Country"
      );
      const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
        `Slot Provider ${Date.now()}`
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: serviceProvider.id,
          countryId: country.id,
          name: "Test Subscription",
          email: `slot-${Date.now()}@example.com`,
          ...subscriptionSecrets(),
          maxSlots: 5,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(subscription.id);

      const createdSlot = await slotRepository.create({
        userId: user.id,
        subscriptionId: subscription.id,
      });
      cleanup.trackSubscriptionSlot(createdSlot.id);

      expect(createdSlot.userId).toBe(user.id);
      expect(createdSlot.subscriptionId).toBe(subscription.id);

      const foundSlot = await slotRepository.findActiveByUserAndProvider(
        user.id,
        serviceProvider.id
      );
      expect(foundSlot?.id).toBe(createdSlot.id);

      const foundBySubscription = await slotRepository.findByUserAndSubscription(
        user.id,
        subscription.id
      );
      expect(foundBySubscription?.id).toBe(createdSlot.id);
    })
  );

  it(
    "creates and updates subscription requests",
    withTestCleanup(async (cleanup: TestDataCleanup) => {
      const user = await cleanup.getOrCreateTestUser(
        `requesttest-${Date.now()}@example.com`
      );
      const country = await cleanup.getOrCreateTestCountry(
        `R${Date.now().toString().slice(-6)}`,
        "Request Test Country"
      );
      const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
        `Request Provider ${Date.now()}`
      );

      const createdRequest = await requestRepository.create({
        userId: user.id,
        serviceProviderId: serviceProvider.id,
        countryId: country.id,
      });
      cleanup.trackSubscriptionRequest(createdRequest.id);

      expect(createdRequest.status).toBe(SubscriptionRequestStatus.PENDING);

      const pending = await requestRepository.findPendingByProviderAndCountry(
        serviceProvider.id,
        country.id
      );
      expect(pending.map((request) => request.id)).toContain(createdRequest.id);

      const updated = await requestRepository.update(createdRequest.id, {
        status: SubscriptionRequestStatus.ASSIGNED,
      });
      expect(updated.status).toBe(SubscriptionRequestStatus.ASSIGNED);
    })
  );

  it(
    "prevents duplicate slots for the same user and subscription",
    withTestCleanup(async (cleanup: TestDataCleanup) => {
      const user = await cleanup.getOrCreateTestUser(
        `duplicate-${Date.now()}@example.com`
      );
      const country = await cleanup.getOrCreateTestCountry(
        `D${Date.now().toString().slice(-6)}`,
        "Duplicate Slot Country"
      );
      const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
        `Duplicate Provider ${Date.now()}`
      );
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: serviceProvider.id,
          countryId: country.id,
          name: "Duplicate Test Subscription",
          email: `duplicate-sub-${Date.now()}@example.com`,
          ...subscriptionSecrets(),
          maxSlots: 5,
          expiresAt: FUTURE_EXPIRES_AT,
        },
      });
      cleanup.trackSubscription(subscription.id);

      const slot = await slotRepository.create({
        userId: user.id,
        subscriptionId: subscription.id,
      });
      cleanup.trackSubscriptionSlot(slot.id);

      await expect(
        slotRepository.create({
          userId: user.id,
          subscriptionId: subscription.id,
        })
      ).rejects.toThrow();
    })
  );
});
