import { Prisma } from "@prisma/client";
import { SubscriptionService } from "../../../src/services/subscriptions";
import {
  ISlotAssignmentService,
  ISubscription,
  ISubscriptionRepository,
  ISubscriptionRequestRepository,
  ISubscriptionSlotRepository,
} from "../../../src/types/subscriptions";
import { IServiceProviderRepository } from "../../../src/types/serviceProviders";
import { ICountryRepository } from "../../../src/types/countries";
import { ValidationError } from "../../../src/utils/errors";

const country = {
  id: "country_123",
  name: "United States",
  code: "US",
  alpha3: "USA",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function subscription(overrides: Partial<ISubscription> = {}): ISubscription {
  return {
    id: "sub_123",
    serviceProviderId: "sp_123",
    countryId: "country_123",
    name: "Netflix Premium",
    email: "test@example.com",
    passwordCiphertext: "cipher",
    passwordIv: "iv",
    passwordTag: "tag",
    keyVersion: 1,
    needsCredentialReset: false,
    maxSlots: 4,
    occupiedSlots: 1,
    expiresAt: null,
    renewalInfo: null,
    userPrice: new Prisma.Decimal("15.99"),
    currencyId: "currency_123",
    metadata: { plan: "premium" },
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    country,
    ...overrides,
  };
}

describe("SubscriptionService", () => {
  const subscriptionRepository: jest.Mocked<ISubscriptionRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsByEmail: jest.fn(),
    findByServiceProviderId: jest.fn(),
    count: jest.fn(),
    countByServiceProviderId: jest.fn(),
  };
  const slotRepository: jest.Mocked<ISubscriptionSlotRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findBySubscriptionId: jest.fn(),
    findByUserAndSubscription: jest.fn(),
    findActiveByUserAndProvider: jest.fn(),
    countActiveBySubscriptionId: jest.fn(),
    release: jest.fn(),
  };
  const requestRepository: jest.Mocked<ISubscriptionRequestRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findPendingByProviderAndCountry: jest.fn(),
    update: jest.fn(),
  };
  const serviceProviderRepository: jest.Mocked<IServiceProviderRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    existsByName: jest.fn(),
    addSupportedCountries: jest.fn(),
    removeSupportedCountries: jest.fn(),
    getSupportedCountries: jest.fn(),
  };
  const countryRepository: jest.Mocked<ICountryRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findByAlpha3: jest.fn(),
    findMany: jest.fn(),
    findActive: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsByCode: jest.fn(),
    existsByAlpha3: jest.fn(),
    existsByName: jest.fn(),
  };
  const slotAssignmentService: jest.Mocked<ISlotAssignmentService> = {
    assignSlotToUser: jest.fn(),
    processPending: jest.fn(),
    releaseExpiredSlots: jest.fn(),
  };

  let service: SubscriptionService;

  const validCreateData = {
    serviceProviderId: "sp_123",
    name: "Netflix Premium",
    email: "test@example.com",
    password: "password123",
    maxSlots: 4,
    countryId: "country_123",
    userPrice: 15.99,
    currencyId: "currency_123",
    metadata: { plan: "premium" },
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionService(
      subscriptionRepository,
      slotRepository,
      requestRepository,
      serviceProviderRepository,
      countryRepository,
      slotAssignmentService
    );
    serviceProviderRepository.findById.mockResolvedValue({
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    countryRepository.findById.mockResolvedValue(country);
    serviceProviderRepository.getSupportedCountries.mockResolvedValue([country]);
    subscriptionRepository.existsByEmail.mockResolvedValue(false);
    slotAssignmentService.processPending.mockResolvedValue(0);
  });

  describe("createSubscription", () => {
    it("stores encrypted credentials and maxSlots, then processes the queue", async () => {
      const created = subscription();
      subscriptionRepository.create.mockResolvedValue(created);
      subscriptionRepository.findById.mockResolvedValue(created);

      const result = await service.createSubscription(validCreateData);

      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceProviderId: "sp_123",
          name: "Netflix Premium",
          email: "test@example.com",
          maxSlots: 4,
          needsCredentialReset: false,
          passwordCiphertext: expect.any(String),
          passwordIv: expect.any(String),
          passwordTag: expect.any(String),
          keyVersion: expect.any(Number),
        })
      );
      const payload = subscriptionRepository.create.mock.calls[0][0];
      expect(payload).not.toHaveProperty("password");
      expect(payload).not.toHaveProperty("passwordHash");
      expect(payload).not.toHaveProperty("availableSlots");
      expect(slotAssignmentService.processPending).toHaveBeenCalledWith(
        "sp_123",
        "country_123"
      );
      expect(result.maxSlots).toBe(4);
      expect(result.availableSlots).toBe(3);
      expect(result).not.toHaveProperty("passwordCiphertext");
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("throws when the service provider does not exist", async () => {
      serviceProviderRepository.findById.mockResolvedValue(null);

      await expect(service.createSubscription(validCreateData)).rejects.toThrow(
        "Service provider not found"
      );
      expect(subscriptionRepository.create).not.toHaveBeenCalled();
    });

    it("throws when the email already exists", async () => {
      subscriptionRepository.existsByEmail.mockResolvedValue(true);

      await expect(service.createSubscription(validCreateData)).rejects.toThrow(
        "A subscription with this email already exists"
      );
      expect(subscriptionRepository.create).not.toHaveBeenCalled();
    });

    it("rejects an empty name, invalid email, short password, and invalid maxSlots", async () => {
      await expect(
        service.createSubscription({ ...validCreateData, name: "" })
      ).rejects.toThrow("Subscription name is required");
      await expect(
        service.createSubscription({ ...validCreateData, email: "invalid-email" })
      ).rejects.toThrow("A valid email is required");
      await expect(
        service.createSubscription({ ...validCreateData, password: "123" })
      ).rejects.toThrow("Password must be at least 6 characters long");
      await expect(
        service.createSubscription({ ...validCreateData, maxSlots: 0 })
      ).rejects.toBeInstanceOf(ValidationError);
      await expect(
        service.createSubscription({ ...validCreateData, maxSlots: 0 })
      ).rejects.toThrow("Max slots must be between 1 and 100");
      expect(serviceProviderRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe("getSubscriptionById", () => {
    it("returns a response with available slots derived from occupancy", async () => {
      subscriptionRepository.findById.mockResolvedValue(subscription());

      const result = await service.getSubscriptionById("sub_123");

      expect(subscriptionRepository.findById).toHaveBeenCalledWith("sub_123");
      expect(result.availableSlots).toBe(3);
      expect(result.maxSlots).toBe(4);
    });

    it("throws when the subscription is missing", async () => {
      subscriptionRepository.findById.mockResolvedValue(null);

      await expect(service.getSubscriptionById("missing")).rejects.toThrow(
        "Subscription not found"
      );
    });
  });

  describe("getSubscriptions", () => {
    it("returns the repository page", async () => {
      subscriptionRepository.findMany.mockResolvedValue({
        subscriptions: [subscription(), subscription({ id: "sub_2", occupiedSlots: 4 })],
        total: 2,
      });

      const result = await service.getSubscriptions({ page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.subscriptions[0].availableSlots).toBe(3);
      expect(result.subscriptions[1].availableSlots).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
    });

    it("uses page 1 when page is omitted or zero", async () => {
      subscriptionRepository.findMany.mockResolvedValue({
        subscriptions: [],
        total: 0,
      });

      await expect(service.getSubscriptions()).resolves.toMatchObject({
        page: 1,
        limit: 10,
      });
      await expect(service.getSubscriptions({ page: 0 })).resolves.toMatchObject({
        page: 1,
      });
    });
  });

  describe("updateSubscription", () => {
    it("re-encrypts a replacement password and clears the reset flag", async () => {
      const existing = subscription({ maxSlots: 4, occupiedSlots: 1 });
      const updated = subscription({ name: "Netflix Premium Updated", maxSlots: 5 });
      subscriptionRepository.findById
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      subscriptionRepository.update.mockResolvedValue(updated);

      const result = await service.updateSubscription("sub_123", {
        name: "Netflix Premium Updated",
        maxSlots: 5,
        password: "newPassword123",
      });

      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        "sub_123",
        expect.objectContaining({
          name: "Netflix Premium Updated",
          maxSlots: 5,
          needsCredentialReset: false,
          passwordCiphertext: expect.any(String),
          passwordIv: expect.any(String),
          passwordTag: expect.any(String),
        })
      );
      const payload = subscriptionRepository.update.mock.calls[0][1];
      expect(payload).not.toHaveProperty("password");
      expect(payload).not.toHaveProperty("passwordHash");
      expect(slotAssignmentService.processPending).toHaveBeenCalledWith(
        updated.serviceProviderId,
        updated.countryId
      );
      expect(result.availableSlots).toBe(4);
    });

    it("rejects maxSlots below the number of active slots", async () => {
      subscriptionRepository.findById.mockResolvedValue(
        subscription({ occupiedSlots: 3, maxSlots: 4 })
      );

      await expect(
        service.updateSubscription("sub_123", { maxSlots: 2 })
      ).rejects.toThrow(
        "Max slots cannot be lower than the number of active slots"
      );
      expect(subscriptionRepository.update).not.toHaveBeenCalled();
    });

    it("throws when the subscription does not exist", async () => {
      subscriptionRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateSubscription("missing", { name: "Updated" })
      ).rejects.toThrow("Subscription not found");
    });
  });

  describe("deleteSubscription", () => {
    it("deletes an existing subscription", async () => {
      subscriptionRepository.findById.mockResolvedValue(subscription());

      await service.deleteSubscription("sub_123");

      expect(subscriptionRepository.delete).toHaveBeenCalledWith("sub_123");
    });

    it("throws when the subscription does not exist", async () => {
      subscriptionRepository.findById.mockResolvedValue(null);

      await expect(service.deleteSubscription("missing")).rejects.toThrow(
        "Subscription not found"
      );
      expect(subscriptionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("getSubscriptionsByServiceProvider", () => {
    it("returns subscriptions for an existing provider", async () => {
      subscriptionRepository.findByServiceProviderId.mockResolvedValue([
        subscription(),
      ]);

      const result = await service.getSubscriptionsByServiceProvider("sp_123");

      expect(result).toHaveLength(1);
      expect(result[0].availableSlots).toBe(3);
    });

    it("throws when the provider does not exist", async () => {
      serviceProviderRepository.findById.mockResolvedValue(null);

      await expect(
        service.getSubscriptionsByServiceProvider("missing")
      ).rejects.toThrow("Service provider not found");
    });
  });
});
