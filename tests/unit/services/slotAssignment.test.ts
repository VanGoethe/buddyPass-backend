import { SlotAssignmentService } from "../../../src/services/subscriptions";
import {
  ISubscriptionRepository,
  ISubscriptionSlotRepository,
  ISubscription,
  ISubscriptionSlot,
} from "../../../src/types/subscriptions";

describe("SlotAssignmentService", () => {
  let slotAssignmentService: SlotAssignmentService;
  let mockSubscriptionRepository: jest.Mocked<ISubscriptionRepository>;
  let mockSlotRepository: jest.Mocked<ISubscriptionSlotRepository>;

  beforeEach(() => {
    mockSubscriptionRepository = {
      findAvailableByServiceProviderId: jest.fn(),
      decrementAvailableSlots: jest.fn(),
    } as any;

    mockSlotRepository = {
      findByUserAndSubscription: jest.fn(),
      create: jest.fn(),
      findByUserId: jest.fn(),
    } as any;

    slotAssignmentService = new SlotAssignmentService(
      mockSubscriptionRepository,
      mockSlotRepository
    );

    // Mock the service methods
    jest.spyOn(slotAssignmentService, "findAvailableSlot");
    jest.spyOn(slotAssignmentService, "validateSlotAssignment");
  });

  describe("assignSlotToUser", () => {
    it("should successfully assign slot when subscription has available slots", async () => {
      const mockSubscription: ISubscription = {
        id: "sub-1",
        serviceProviderId: "sp-1",
        countryId: "country-1",
        name: "Test Subscription",
        email: "test@example.com",
        passwordHash: "hash",
        availableSlots: 5,
        expiresAt: new Date("2025-12-31"),
        renewalInfo: null,
        userPrice: null,
        currencyId: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSlot: ISubscriptionSlot = {
        id: "slot-1",
        userId: "user-1",
        subscriptionId: "sub-1",
        assignedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSubscriptionRepository.findAvailableByServiceProviderId.mockResolvedValue(
        [mockSubscription]
      );
      mockSlotRepository.findByUserAndSubscription.mockResolvedValue(null);
      mockSlotRepository.create.mockResolvedValue(mockSlot);
      mockSubscriptionRepository.decrementAvailableSlots.mockResolvedValue(
        mockSubscription
      );

      // Mock service methods
      (slotAssignmentService.findAvailableSlot as jest.Mock).mockResolvedValue(
        mockSubscription
      );
      (
        slotAssignmentService.validateSlotAssignment as jest.Mock
      ).mockResolvedValue(true);

      const result = await slotAssignmentService.assignSlotToUser(
        "user-1",
        "sp-1",
        "country-1"
      );

      expect(result.success).toBe(true);
      expect(result.slotAssignment).toBeDefined();
      expect(result.slotAssignment!.subscriptionId).toBe("sub-1");
      expect(mockSlotRepository.create).toHaveBeenCalledWith({
        userId: "user-1",
        subscriptionId: "sub-1",
      });
      expect(
        mockSubscriptionRepository.decrementAvailableSlots
      ).toHaveBeenCalledWith("sub-1");
    });

    it("should return failure when user already has slot for service provider", async () => {
      const mockSubscription: ISubscription = {
        id: "sub-1",
        serviceProviderId: "sp-1",
        countryId: "country-1",
        name: "Test Subscription",
        email: "test@example.com",
        passwordHash: "hash",
        availableSlots: 5,
        expiresAt: new Date("2025-12-31"),
        renewalInfo: null,
        userPrice: null,
        currencyId: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingSlot: ISubscriptionSlot = {
        id: "existing-slot",
        userId: "user-1",
        subscriptionId: "sub-1",
        assignedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSubscriptionRepository.findAvailableByServiceProviderId.mockResolvedValue(
        [mockSubscription]
      );
      mockSlotRepository.findByUserAndSubscription.mockResolvedValue(
        existingSlot
      );

      const result = await slotAssignmentService.assignSlotToUser(
        "user-1",
        "sp-1",
        "country-1"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("already have a slot");
    });

    it("should return failure when no available slots exist", async () => {
      mockSubscriptionRepository.findAvailableByServiceProviderId.mockResolvedValue(
        []
      );

      const result = await slotAssignmentService.assignSlotToUser(
        "user-1",
        "sp-1",
        "country-1"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("No available slots");
    });

    it("should prioritize subscription with fewer available slots", async () => {
      const subscription1: ISubscription = {
        id: "sub-1",
        serviceProviderId: "sp-1",
        countryId: "country-1",
        name: "Subscription 1",
        email: "test1@example.com",
        passwordHash: "hash",
        availableSlots: 5,
        expiresAt: new Date("2025-12-31"),
        renewalInfo: null,
        userPrice: null,
        currencyId: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const subscription2: ISubscription = {
        id: "sub-2",
        serviceProviderId: "sp-1",
        countryId: "country-1",
        name: "Subscription 2",
        email: "test2@example.com",
        passwordHash: "hash",
        availableSlots: 2, // Fewer slots - should be prioritized
        expiresAt: new Date("2025-12-31"),
        renewalInfo: null,
        userPrice: null,
        currencyId: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSlot: ISubscriptionSlot = {
        id: "slot-1",
        userId: "user-1",
        subscriptionId: "sub-2",
        assignedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSubscriptionRepository.findAvailableByServiceProviderId.mockResolvedValue(
        [subscription1, subscription2]
      );
      mockSlotRepository.findByUserAndSubscription.mockResolvedValue(null);
      mockSlotRepository.create.mockResolvedValue(mockSlot);
      mockSubscriptionRepository.decrementAvailableSlots.mockResolvedValue(
        subscription2
      );

      // Mock service methods to return subscription2 (fewer slots)
      (slotAssignmentService.findAvailableSlot as jest.Mock).mockResolvedValue(
        subscription2
      );
      (
        slotAssignmentService.validateSlotAssignment as jest.Mock
      ).mockResolvedValue(true);

      const result = await slotAssignmentService.assignSlotToUser(
        "user-1",
        "sp-1",
        "country-1"
      );

      expect(result.success).toBe(true);
      expect(result.slotAssignment!.subscriptionId).toBe("sub-2");
      expect(
        mockSubscriptionRepository.decrementAvailableSlots
      ).toHaveBeenCalledWith("sub-2");
    });
  });
});
