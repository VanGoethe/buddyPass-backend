import { PrismaClient } from "@prisma/client";
import {
  PrismaSubscriptionSlotRepository,
  PrismaSubscriptionRequestRepository,
} from "../../../src/repositories/subscriptions";
import { SubscriptionRequestStatus } from "../../../src/types/subscriptions";
import { withTestCleanup, TestDataCleanup } from "../../utils/testCleanup";

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
    "should create and find subscription slots",
    withTestCleanup(async (cleanup: TestDataCleanup) => {
      // Create test data
      const user = await cleanup.getOrCreateTestUser("slottest@example.com");
      const country = await cleanup.getOrCreateTestCountry(
        "US",
        "United States"
      );
      const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
        "Test Provider"
      );

      // Link service provider to country
      await prisma.serviceProviderCountry.create({
        data: {
          serviceProviderId: serviceProvider.id,
          countryId: country.id,
        },
      });

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: serviceProvider.id,
          countryId: country.id,
          name: "Test Subscription",
          email: "test@example.com",
          passwordHash: "$2b$10$test.hash",
          availableSlots: 5,
          expiresAt: new Date("2025-12-31"),
        },
      });
      cleanup.trackSubscription(subscription.id);

      // Test slot creation
      const slotData = {
        userId: user.id,
        subscriptionId: subscription.id,
      };

      const createdSlot = await slotRepository.create(slotData);
      expect(createdSlot.userId).toBe(user.id);
      expect(createdSlot.subscriptionId).toBe(subscription.id);

      // Test finding slot by user and service provider
      const foundSlot = await slotRepository.findByUserAndServiceProvider(
        user.id,
        serviceProvider.id
      );
      expect(foundSlot).toBeTruthy();
      expect(foundSlot!.id).toBe(createdSlot.id);

      // Test finding slot by user and subscription
      const foundBySubscription =
        await slotRepository.findByUserAndSubscription(
          user.id,
          subscription.id
        );
      expect(foundBySubscription).toBeTruthy();
      expect(foundBySubscription!.id).toBe(createdSlot.id);
    })
  );

  it(
    "should create and manage subscription requests",
    withTestCleanup(async (cleanup: TestDataCleanup) => {
      // Create test data
      const user = await cleanup.getOrCreateTestUser("requesttest@example.com");
      const country = await cleanup.getOrCreateTestCountry("CA", "Canada");
      const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
        "Request Provider"
      );

      // Test request creation
      const requestData = {
        userId: user.id,
        serviceProviderId: serviceProvider.id,
        countryId: country.id,
      };

      const createdRequest = await requestRepository.create(requestData);
      expect(createdRequest.userId).toBe(user.id);
      expect(createdRequest.serviceProviderId).toBe(serviceProvider.id);
      expect(createdRequest.status).toBe(SubscriptionRequestStatus.PENDING);

      // Test finding pending requests
      const pendingRequests =
        await requestRepository.findPendingByServiceProvider(
          serviceProvider.id
        );
      expect(pendingRequests.length).toBe(1);
      expect(pendingRequests[0].id).toBe(createdRequest.id);

      // Test status update
      const updatedRequest = await requestRepository.updateStatus(
        createdRequest.id,
        SubscriptionRequestStatus.ASSIGNED
      );
      expect(updatedRequest.status).toBe(SubscriptionRequestStatus.ASSIGNED);
    })
  );

  it(
    "should prevent duplicate slots for same user and subscription",
    withTestCleanup(async (cleanup: TestDataCleanup) => {
      // Create test data
      const user = await cleanup.getOrCreateTestUser("duplicate@example.com");
      const country = await cleanup.getOrCreateTestCountry(
        "UK",
        "United Kingdom"
      );
      const serviceProvider = await cleanup.getOrCreateTestServiceProvider(
        "Duplicate Provider"
      );

      // Link service provider to country
      await prisma.serviceProviderCountry.create({
        data: {
          serviceProviderId: serviceProvider.id,
          countryId: country.id,
        },
      });

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          serviceProviderId: serviceProvider.id,
          countryId: country.id,
          name: "Duplicate Test Subscription",
          email: "duplicate@example.com",
          passwordHash: "$2b$10$test.hash",
          availableSlots: 5,
          expiresAt: new Date("2025-12-31"),
        },
      });
      cleanup.trackSubscription(subscription.id);

      // Create first slot
      const slotData = {
        userId: user.id,
        subscriptionId: subscription.id,
      };

      await slotRepository.create(slotData);

      // Try to create duplicate slot - should throw
      await expect(slotRepository.create(slotData)).rejects.toThrow();
    })
  );
});
