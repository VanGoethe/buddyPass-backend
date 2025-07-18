/**
 * Subscription Repository Integration Tests
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaSubscriptionRepository } from "../../../src/repositories/subscriptions";
import { Subscription } from "../../../src/models/subscriptions";
import { SubscriptionQueryOptions } from "../../../src/types/subscriptions";

// Create a mock Prisma client with proper typing
const createMockPrisma = () => {
  return {
    subscription: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as any;
};

describe("PrismaSubscriptionRepository", () => {
  let repository: PrismaSubscriptionRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repository = new PrismaSubscriptionRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createData = {
      serviceProviderId: "sp_123",
      name: "Netflix Premium",
      email: "test@example.com",
      password: "originalPassword",
      passwordHash: "hashedPassword",
      availableSlots: 4,
      countryId: "country_123",
      userPrice: 15.99,
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: { plan: "premium" },
      isActive: true,
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
      userPrice: new Prisma.Decimal("15.99"),
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: { plan: "premium" },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should create a subscription successfully", async () => {
      mockPrisma.subscription.create.mockResolvedValue(mockCreatedSubscription);

      const result = await repository.create(createData);

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: {
          serviceProviderId: "sp_123",
          name: "Netflix Premium",
          email: "test@example.com",
          passwordHash: "hashedPassword",
          availableSlots: 4,
          countryId: "country_123",
          expiresAt: undefined,
          renewalInfo: undefined,
          userPrice: 15.99,
          currencyId: "cmc6lpjqw00009utlsvz3enyx",
          metadata: { plan: "premium" },
          isActive: true,
        },
        include: {
          country: true,
        },
      });
      expect(result).toBeInstanceOf(Subscription);
      expect(result.id).toBe("sub_123");
      expect(result.email).toBe("test@example.com");
    });

    it("should handle minimal required data", async () => {
      const minimalData = {
        serviceProviderId: "sp_123",
        name: "Basic Netflix",
        email: "basic@example.com",
        password: "basicPassword",
        passwordHash: "hashedPassword",
        availableSlots: 1,
      };

      const mockCreatedMinimal = {
        ...mockCreatedSubscription,
        name: "Basic Netflix",
        email: "basic@example.com",
        availableSlots: 1,
        countryId: null,
        userPrice: null,
        currencyId: null,
        metadata: null,
      };

      mockPrisma.subscription.create.mockResolvedValue(mockCreatedMinimal);

      const result = await repository.create(minimalData);

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: {
          serviceProviderId: "sp_123",
          name: "Basic Netflix",
          email: "basic@example.com",
          passwordHash: "hashedPassword",
          availableSlots: 1,
          countryId: undefined,
          expiresAt: undefined,
          renewalInfo: undefined,
          userPrice: undefined,
          currencyId: undefined,
          metadata: undefined,
          isActive: true,
        },
        include: {
          country: true,
        },
      });
      expect(result.country).toBeUndefined();
      expect(result.userPrice).toBeNull();
    });

    it("should let Prisma error bubble up for duplicate email (P2002)", async () => {
      const error = new Error("Unique constraint failed");
      (error as any).code = "P2002";
      mockPrisma.subscription.create.mockRejectedValue(error);

      await expect(repository.create(createData)).rejects.toThrow(
        "Unique constraint failed"
      );
    });

    it("should let Prisma error bubble up for non-existent service provider (P2003)", async () => {
      const error = new Error("Foreign key constraint failed");
      (error as any).code = "P2003";
      mockPrisma.subscription.create.mockRejectedValue(error);

      await expect(repository.create(createData)).rejects.toThrow(
        "Foreign key constraint failed"
      );
    });

    it("should let Prisma error bubble up for other database errors", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.subscription.create.mockRejectedValue(error);

      await expect(repository.create(createData)).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("findById", () => {
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
      userPrice: new Prisma.Decimal("15.99"),
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      metadata: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should find subscription by ID successfully", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await repository.findById("sub_123");

      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: "sub_123" },
        include: {
          country: false,
        },
      });
      expect(result).toBeInstanceOf(Subscription);
      expect(result?.id).toBe("sub_123");
    });

    it("should return null if subscription not found", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await repository.findById("sub_nonexistent");

      expect(result).toBeNull();
    });

    it("should let database errors bubble up", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.subscription.findUnique.mockRejectedValue(error);

      await expect(repository.findById("sub_123")).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("findMany", () => {
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
        userPrice: new Prisma.Decimal("15.99"),
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sub_2",
        serviceProviderId: "sp_456",
        countryId: "country_456",
        name: "Spotify Premium",
        email: "test2@example.com",
        passwordHash: "hashedPassword",
        availableSlots: 2,
        expiresAt: null,
        renewalInfo: null,
        userPrice: new Prisma.Decimal("9.99"),
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should find many subscriptions with default options", async () => {
      mockPrisma.subscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrisma.subscription.count.mockResolvedValue(2);

      const result = await repository.findMany();

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          country: true,
        },
      });
      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(result.subscriptions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should find many subscriptions with filtering options", async () => {
      const options: SubscriptionQueryOptions = {
        page: 1,
        limit: 5,
        sortBy: "name",
        sortOrder: "asc",
        search: "Netflix",
        serviceProviderId: "sp_123",
        isActive: true,
        countryId: "country_123",
      };

      mockPrisma.subscription.findMany.mockResolvedValue([
        mockSubscriptions[0],
      ]);
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await repository.findMany(options);

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: "Netflix", mode: "insensitive" } },
            { email: { contains: "Netflix", mode: "insensitive" } },
          ],
          serviceProviderId: "sp_123",
          isActive: true,
          countryId: "country_123",
        },
        skip: 0,
        take: 5,
        orderBy: {
          name: "asc",
        },
        include: {
          country: true,
        },
      });
      expect(result.subscriptions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should accept any limit value without capping", async () => {
      const options = { limit: 150 };

      mockPrisma.subscription.findMany.mockResolvedValue([]);
      mockPrisma.subscription.count.mockResolvedValue(0);

      await repository.findMany(options);

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 150 })
      );
    });

    it("should let database errors bubble up", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.subscription.findMany.mockRejectedValue(error);

      await expect(repository.findMany()).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("update", () => {
    const updateData = {
      name: "Netflix Premium Updated",
      availableSlots: 5,
      userPrice: 18.99,
      currencyId: "cmc6lpjr700039utl82uj2id7",
    };

    const mockUpdatedSubscription = {
      id: "sub_123",
      serviceProviderId: "sp_123",
      countryId: "country_123",
      name: "Netflix Premium Updated",
      email: "test@example.com",
      passwordHash: "hashedPassword",
      availableSlots: 5,
      expiresAt: null,
      renewalInfo: null,
      userPrice: new Prisma.Decimal("18.99"),
      currencyId: "cmc6lpjr700039utl82uj2id7",
      metadata: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should update subscription successfully", async () => {
      mockPrisma.subscription.update.mockResolvedValue(mockUpdatedSubscription);

      const result = await repository.update("sub_123", updateData);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub_123" },
        data: {
          countryId: undefined,
          name: "Netflix Premium Updated",
          email: undefined,
          passwordHash: undefined,
          availableSlots: 5,
          expiresAt: undefined,
          renewalInfo: undefined,
          userPrice: 18.99,
          currencyId: "cmc6lpjr700039utl82uj2id7",
          metadata: undefined,
          isActive: undefined,
        },
        include: {
          country: true,
        },
      });
      expect(result).toBeInstanceOf(Subscription);
      expect(result.name).toBe("Netflix Premium Updated");
    });

    it("should handle password hash updates", async () => {
      const updateDataWithPassword = {
        ...updateData,
        passwordHash: "newHashedPassword",
      };

      mockPrisma.subscription.update.mockResolvedValue(mockUpdatedSubscription);

      await repository.update("sub_123", updateDataWithPassword);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub_123" },
        data: {
          countryId: undefined,
          name: "Netflix Premium Updated",
          email: undefined,
          passwordHash: "newHashedPassword",
          availableSlots: 5,
          expiresAt: undefined,
          renewalInfo: undefined,
          userPrice: 18.99,
          currencyId: "cmc6lpjr700039utl82uj2id7",
          metadata: undefined,
          isActive: undefined,
        },
        include: {
          country: true,
        },
      });
    });

    it("should pass undefined values directly to Prisma", async () => {
      const updateDataWithUndefined = {
        userPrice: undefined,
        metadata: undefined,
      };

      mockPrisma.subscription.update.mockResolvedValue(mockUpdatedSubscription);

      await repository.update("sub_123", updateDataWithUndefined);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub_123" },
        data: {
          countryId: undefined,
          name: undefined,
          email: undefined,
          passwordHash: undefined,
          availableSlots: undefined,
          expiresAt: undefined,
          renewalInfo: undefined,
          userPrice: undefined,
          currencyId: undefined,
          metadata: undefined,
          isActive: undefined,
        },
        include: {
          country: true,
        },
      });
    });

    it("should let Prisma error bubble up if subscription not found (P2025)", async () => {
      const error = new Error("Record not found");
      (error as any).code = "P2025";
      mockPrisma.subscription.update.mockRejectedValue(error);

      await expect(
        repository.update("sub_nonexistent", updateData)
      ).rejects.toThrow("Record not found");
    });

    it("should let Prisma error bubble up for duplicate email (P2002)", async () => {
      const error = new Error("Unique constraint failed");
      (error as any).code = "P2002";
      mockPrisma.subscription.update.mockRejectedValue(error);

      await expect(repository.update("sub_123", updateData)).rejects.toThrow(
        "Unique constraint failed"
      );
    });
  });

  describe("delete", () => {
    it("should delete subscription successfully", async () => {
      mockPrisma.subscription.delete.mockResolvedValue({} as any);

      await repository.delete("sub_123");

      expect(mockPrisma.subscription.delete).toHaveBeenCalledWith({
        where: { id: "sub_123" },
      });
    });

    it("should let Prisma error bubble up if subscription not found (P2025)", async () => {
      const error = new Error("Record not found");
      (error as any).code = "P2025";
      mockPrisma.subscription.delete.mockRejectedValue(error);

      await expect(repository.delete("sub_nonexistent")).rejects.toThrow(
        "Record not found"
      );
    });
  });

  describe("existsByEmail", () => {
    it("should return true if subscription exists by email", async () => {
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await repository.existsByEmail("test@example.com");

      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
        },
      });
      expect(result).toBe(true);
    });

    it("should return false if subscription does not exist by email", async () => {
      mockPrisma.subscription.count.mockResolvedValue(0);

      const result = await repository.existsByEmail("nonexistent@example.com");

      expect(result).toBe(false);
    });

    it("should exclude specific ID when checking", async () => {
      mockPrisma.subscription.count.mockResolvedValue(0);

      const result = await repository.existsByEmail(
        "test@example.com",
        "sub_123"
      );

      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
          id: { not: "sub_123" },
        },
      });
      expect(result).toBe(false);
    });
  });

  describe("findByServiceProviderId", () => {
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
        userPrice: new Prisma.Decimal("15.99"),
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
        metadata: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should find subscriptions by service provider ID", async () => {
      mockPrisma.subscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await repository.findByServiceProviderId("sp_123");

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: { serviceProviderId: "sp_123" },
        include: {
          country: true,
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Subscription);
    });

    it("should let database errors bubble up", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.subscription.findMany.mockRejectedValue(error);

      await expect(
        repository.findByServiceProviderId("sp_123")
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("countByServiceProviderId", () => {
    it("should count subscriptions by service provider ID", async () => {
      mockPrisma.subscription.count.mockResolvedValue(3);

      const result = await repository.countByServiceProviderId("sp_123");

      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: { serviceProviderId: "sp_123" },
      });
      expect(result).toBe(3);
    });

    it("should let database errors bubble up", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.subscription.count.mockRejectedValue(error);

      await expect(
        repository.countByServiceProviderId("sp_123")
      ).rejects.toThrow("Database connection failed");
    });
  });
});
