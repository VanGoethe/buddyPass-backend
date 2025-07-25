/**
 * Subscription Service Unit Tests
 */

import bcrypt from "bcryptjs";
import { SubscriptionService } from "../../../src/services/subscriptions";
import {
  ISubscriptionRepository,
  ISubscriptionSlotRepository,
  ISubscriptionRequestRepository,
  ISlotAssignmentService,
} from "../../../src/types/subscriptions";
import { IServiceProviderRepository } from "../../../src/types/serviceProviders";
import { ICountryRepository } from "../../../src/types/countries";
import { Subscription } from "../../../src/models/subscriptions";

// Mock bcrypt
jest.mock("bcryptjs");
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock the repositories
const mockSubscriptionRepository: jest.Mocked<ISubscriptionRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  existsByEmail: jest.fn(),
  findByServiceProviderId: jest.fn(),
  countByServiceProviderId: jest.fn(),
  findAvailableByServiceProviderId: jest.fn(),
  decrementAvailableSlots: jest.fn(),
};

const mockServiceProviderRepository: jest.Mocked<IServiceProviderRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  existsByName: jest.fn(),
  addSupportedCountries: jest.fn(),
  removeSupportedCountries: jest.fn(),
  getSupportedCountries: jest.fn(),
};

const mockCountryRepository: jest.Mocked<ICountryRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByCode: jest.fn(),
  findByAlpha3: jest.fn(),
  findActive: jest.fn(),
  existsByName: jest.fn(),
  existsByCode: jest.fn(),
  existsByAlpha3: jest.fn(),
};

const mockSubscriptionSlotRepository: jest.Mocked<ISubscriptionSlotRepository> =
  {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findBySubscriptionId: jest.fn(),
    findByUserAndSubscription: jest.fn(),
    findByUserAndServiceProvider: jest.fn(),
    countBySubscriptionId: jest.fn(),
    delete: jest.fn(),
    deleteByUserAndSubscription: jest.fn(),
  };

const mockSubscriptionRequestRepository: jest.Mocked<ISubscriptionRequestRepository> =
  {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findPendingRequests: jest.fn(),
    findPendingByServiceProvider: jest.fn(),
    updateStatus: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

const mockSlotAssignmentService: jest.Mocked<ISlotAssignmentService> = {
  assignSlotToUser: jest.fn(),
  findAvailableSlot: jest.fn(),
  validateSlotAssignment: jest.fn(),
};

describe("SubscriptionService", () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionService = new SubscriptionService(
      mockSubscriptionRepository,
      mockSubscriptionSlotRepository,
      mockSubscriptionRequestRepository,
      mockServiceProviderRepository,
      mockCountryRepository,
      mockSlotAssignmentService
    );
  });

  describe("createSubscription", () => {
    const validCreateData = {
      serviceProviderId: "sp_123",
      name: "Netflix Premium",
      email: "test@example.com",
      password: "password123",
      availableSlots: 4,
      countryId: "country_123",
      userPrice: 15.99,
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: { plan: "premium" },
      isActive: true,
    };

    const mockServiceProvider = {
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCreatedSubscription = {
      id: "sub_123",
      serviceProviderId: "sp_123",
      countryId: "country_123",
      name: "Netflix Premium",
      email: "test@example.com",
      passwordHash: "hashedPassword",
      availableSlots: 4,
      expiresAt: null,
      renewalInfo: null,
      userPrice: { toString: () => "15.99" } as any,
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: { plan: "premium" },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      country: {
        id: "country_123",
        name: "United States",
        code: "US",
        alpha3: "USA",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    it("should create a subscription successfully", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue({
        ...mockServiceProvider,
        supportedCountries: [
          {
            country: {
              id: "country_123",
              name: "United States",
              code: "US",
              alpha3: "USA",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      });
      mockServiceProviderRepository.getSupportedCountries.mockResolvedValue([
        {
          id: "country_123",
          name: "United States",
          code: "US",
          alpha3: "USA",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // Mock country validation
      mockCountryRepository.findById.mockResolvedValue({
        id: "country_123",
        name: "United States",
        code: "US",
        alpha3: "USA",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockSubscriptionRepository.existsByEmail.mockResolvedValue(false);
      mockBcrypt.hash.mockResolvedValue("hashedPassword" as never);
      mockSubscriptionRepository.create.mockResolvedValue(
        mockCreatedSubscription
      );
      // Mock the findById call after creation to get full subscription with relations
      mockSubscriptionRepository.findById.mockResolvedValue(
        mockCreatedSubscription
      );

      const result = await subscriptionService.createSubscription(
        validCreateData
      );

      expect(mockServiceProviderRepository.findById).toHaveBeenCalledWith(
        "sp_123"
      );
      expect(mockSubscriptionRepository.existsByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockSubscriptionRepository.create).toHaveBeenCalledWith({
        ...validCreateData,
        passwordHash: "hashedPassword",
      });
      expect(result.id).toBe("sub_123");
      expect(result.email).toBe("test@example.com");
    });

    it("should throw error if service provider not found", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue(null);

      await expect(
        subscriptionService.createSubscription(validCreateData)
      ).rejects.toThrow("Service provider not found");

      expect(mockServiceProviderRepository.findById).toHaveBeenCalledWith(
        "sp_123"
      );
      expect(mockSubscriptionRepository.existsByEmail).not.toHaveBeenCalled();
      expect(mockSubscriptionRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error if email already exists", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue({
        ...mockServiceProvider,
        supportedCountries: [
          {
            country: {
              id: "country_123",
              name: "United States",
              code: "US",
              alpha3: "USA",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      });
      mockServiceProviderRepository.getSupportedCountries.mockResolvedValue([
        {
          id: "country_123",
          name: "United States",
          code: "US",
          alpha3: "USA",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // Mock country validation
      mockCountryRepository.findById.mockResolvedValue({
        id: "country_123",
        name: "United States",
        code: "US",
        alpha3: "USA",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockSubscriptionRepository.existsByEmail.mockResolvedValue(true);

      await expect(
        subscriptionService.createSubscription(validCreateData)
      ).rejects.toThrow("A subscription with this email already exists");

      expect(mockSubscriptionRepository.existsByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(mockSubscriptionRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error if name is empty", async () => {
      const invalidData = { ...validCreateData, name: "" };

      await expect(
        subscriptionService.createSubscription(invalidData)
      ).rejects.toThrow("Subscription name is required");

      expect(mockServiceProviderRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw error if email is invalid", async () => {
      const invalidData = { ...validCreateData, email: "invalid-email" };

      await expect(
        subscriptionService.createSubscription(invalidData)
      ).rejects.toThrow("Invalid email format");

      expect(mockServiceProviderRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw error if password is too short", async () => {
      const invalidData = { ...validCreateData, password: "123" };

      await expect(
        subscriptionService.createSubscription(invalidData)
      ).rejects.toThrow("Password must be at least 6 characters long");

      expect(mockServiceProviderRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw error if available slots is invalid", async () => {
      const invalidData = { ...validCreateData, availableSlots: 0 };

      await expect(
        subscriptionService.createSubscription(invalidData)
      ).rejects.toThrow("Available slots must be at least 1");

      expect(mockServiceProviderRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe("getSubscriptionById", () => {
    const mockSubscription = {
      id: "sub_123",
      serviceProviderId: "sp_123",
      countryId: "country_123",
      name: "Netflix Premium",
      email: "test@example.com",
      passwordHash: "hashedPassword",
      availableSlots: 4,
      expiresAt: null,
      renewalInfo: null,
      userPrice: { toString: () => "15.99" } as any,
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return subscription successfully", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(mockSubscription);

      const result = await subscriptionService.getSubscriptionById("sub_123");

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith(
        "sub_123",
        true
      );
      expect(result.id).toBe("sub_123");
      expect(result.email).toBe("test@example.com");
    });

    it("should handle empty ID by returning subscription", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(mockSubscription);

      const result = await subscriptionService.getSubscriptionById("");

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith(
        "",
        true
      );
      expect(result.id).toBe("sub_123");
    });

    it("should throw error if subscription not found", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(
        subscriptionService.getSubscriptionById("sub_nonexistent")
      ).rejects.toThrow("Subscription not found");

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith(
        "sub_nonexistent",
        true
      );
    });
  });

  describe("getSubscriptions", () => {
    const mockSubscriptions = [
      {
        id: "sub_1",
        serviceProviderId: "sp_123",
        countryId: "country_123",
        name: "Netflix Premium",
        email: "test1@example.com",
        passwordHash: "hashedPassword",
        availableSlots: 4,
        expiresAt: null,
        renewalInfo: null,
        userPrice: { toString: () => "15.99" } as any,
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sub_2",
        serviceProviderId: "sp_123",
        countryId: "country_123",
        name: "Netflix Basic",
        email: "test2@example.com",
        passwordHash: "hashedPassword",
        availableSlots: 1,
        expiresAt: null,
        renewalInfo: null,
        userPrice: { toString: () => "8.99" } as any,
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should return paginated subscriptions", async () => {
      mockSubscriptionRepository.findMany.mockResolvedValue({
        subscriptions: mockSubscriptions,
        total: 2,
      });

      const result = await subscriptionService.getSubscriptions({
        page: 1,
        limit: 10,
      });

      expect(mockSubscriptionRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result.subscriptions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
    });

    it("should return default pagination if no options provided", async () => {
      mockSubscriptionRepository.findMany.mockResolvedValue({
        subscriptions: [],
        total: 0,
      });

      const result = await subscriptionService.getSubscriptions();

      expect(mockSubscriptionRepository.findMany).toHaveBeenCalledWith(
        undefined
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should handle page 0 by using default pagination", async () => {
      mockSubscriptionRepository.findMany.mockResolvedValue({
        subscriptions: [],
        total: 0,
      });

      const result = await subscriptionService.getSubscriptions({ page: 0 });

      expect(result.page).toBe(1); // Uses default page 1
      expect(result.limit).toBe(10);
    });

    it("should handle high limit by accepting it", async () => {
      mockSubscriptionRepository.findMany.mockResolvedValue({
        subscriptions: [],
        total: 0,
      });

      const result = await subscriptionService.getSubscriptions({ limit: 101 });

      expect(result.limit).toBe(101); // Accepts the high limit
    });
  });

  describe("updateSubscription", () => {
    const mockExistingSubscription = {
      id: "sub_123",
      serviceProviderId: "sp_123",
      countryId: "country_123",
      name: "Netflix Premium",
      email: "test@example.com",
      passwordHash: "hashedPassword",
      availableSlots: 4,
      expiresAt: null,
      renewalInfo: null,
      userPrice: { toString: () => "15.99" } as any,
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateData = {
      name: "Netflix Premium Updated",
      availableSlots: 5,
    };

    const mockUpdatedSubscription = {
      ...mockExistingSubscription,
      name: "Netflix Premium Updated",
      availableSlots: 5,
      updatedAt: new Date(),
    };

    it("should update subscription successfully", async () => {
      // Mock first findById call (existence check)
      mockSubscriptionRepository.findById
        .mockResolvedValueOnce(mockExistingSubscription)
        // Mock second findById call (get updated data)
        .mockResolvedValueOnce(mockUpdatedSubscription);

      mockSubscriptionRepository.update.mockResolvedValue(
        mockUpdatedSubscription
      );

      const result = await subscriptionService.updateSubscription(
        "sub_123",
        updateData
      );

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith(
        "sub_123"
      );
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        "sub_123",
        updateData
      );
      expect(result.name).toBe("Netflix Premium Updated");
      expect(result.availableSlots).toBe(5);
    });

    it("should update subscription with password hashing", async () => {
      const updateDataWithPassword = {
        ...updateData,
        password: "newPassword123",
      };
      mockSubscriptionRepository.findById.mockResolvedValue(
        mockExistingSubscription
      );
      mockBcrypt.hash.mockResolvedValue("newHashedPassword" as never);
      mockSubscriptionRepository.update.mockResolvedValue(
        mockUpdatedSubscription
      );

      await subscriptionService.updateSubscription(
        "sub_123",
        updateDataWithPassword
      );

      expect(mockBcrypt.hash).toHaveBeenCalledWith("newPassword123", 10);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        "sub_123",
        {
          name: "Netflix Premium Updated",
          availableSlots: 5,
          passwordHash: "newHashedPassword",
        }
      );
    });

    it("should handle empty ID by checking existence", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(
        mockExistingSubscription
      );
      mockSubscriptionRepository.update.mockResolvedValue(
        mockUpdatedSubscription
      );

      const result = await subscriptionService.updateSubscription(
        "",
        updateData
      );

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith("");
      expect(result.name).toBe("Netflix Premium Updated");
    });

    it("should throw error if subscription not found", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(
        subscriptionService.updateSubscription("sub_nonexistent", updateData)
      ).rejects.toThrow("Subscription not found");

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith(
        "sub_nonexistent"
      );
      expect(mockSubscriptionRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error if new email already exists", async () => {
      const updateDataWithEmail = {
        ...updateData,
        email: "newemail@example.com",
      };
      mockSubscriptionRepository.findById.mockResolvedValue(
        mockExistingSubscription
      );
      mockSubscriptionRepository.existsByEmail.mockResolvedValue(true);

      await expect(
        subscriptionService.updateSubscription("sub_123", updateDataWithEmail)
      ).rejects.toThrow("A subscription with this email already exists");

      expect(mockSubscriptionRepository.existsByEmail).toHaveBeenCalledWith(
        "newemail@example.com",
        "sub_123"
      );
      expect(mockSubscriptionRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteSubscription", () => {
    const mockSubscription = {
      id: "sub_123",
      serviceProviderId: "sp_123",
      countryId: "country_123",
      name: "Netflix Premium",
      email: "test@example.com",
      passwordHash: "hashedPassword",
      availableSlots: 4,
      expiresAt: null,
      renewalInfo: null,
      userPrice: { toString: () => "15.99" } as any,
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should delete subscription successfully", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.delete.mockResolvedValue();

      await subscriptionService.deleteSubscription("sub_123");

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith(
        "sub_123"
      );
      expect(mockSubscriptionRepository.delete).toHaveBeenCalledWith("sub_123");
    });

    it("should handle empty ID by checking existence", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.delete.mockResolvedValue();

      await subscriptionService.deleteSubscription("");

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith("");
      expect(mockSubscriptionRepository.delete).toHaveBeenCalledWith("");
    });

    it("should throw error if subscription not found", async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(
        subscriptionService.deleteSubscription("sub_nonexistent")
      ).rejects.toThrow("Subscription not found");

      expect(mockSubscriptionRepository.findById).toHaveBeenCalledWith(
        "sub_nonexistent"
      );
      expect(mockSubscriptionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("getSubscriptionsByServiceProvider", () => {
    const mockServiceProvider = {
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSubscriptions = [
      {
        id: "sub_1",
        serviceProviderId: "sp_123",
        countryId: "country_123",
        name: "Netflix Premium",
        email: "test1@example.com",
        passwordHash: "hashedPassword",
        availableSlots: 4,
        expiresAt: null,
        renewalInfo: null,
        userPrice: { toString: () => "15.99" } as any,
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should return subscriptions by service provider successfully", async () => {
      mockSubscriptionRepository.findByServiceProviderId.mockResolvedValue(
        mockSubscriptions
      );

      const result =
        await subscriptionService.getSubscriptionsByServiceProvider("sp_123");

      expect(
        mockSubscriptionRepository.findByServiceProviderId
      ).toHaveBeenCalledWith("sp_123");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sub_1");
    });

    it("should handle empty service provider ID", async () => {
      mockSubscriptionRepository.findByServiceProviderId.mockResolvedValue([]);

      const result =
        await subscriptionService.getSubscriptionsByServiceProvider("");

      expect(
        mockSubscriptionRepository.findByServiceProviderId
      ).toHaveBeenCalledWith("");
      expect(result).toHaveLength(0);
    });

    it("should return empty array for non-existent service provider", async () => {
      mockSubscriptionRepository.findByServiceProviderId.mockResolvedValue([]);

      const result =
        await subscriptionService.getSubscriptionsByServiceProvider(
          "sp_nonexistent"
        );

      expect(
        mockSubscriptionRepository.findByServiceProviderId
      ).toHaveBeenCalledWith("sp_nonexistent");
      expect(result).toHaveLength(0);
    });
  });
});
