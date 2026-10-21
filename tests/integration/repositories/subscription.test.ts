import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaSubscriptionRepository } from "../../../src/repositories/subscriptions";
import { Subscription } from "../../../src/models/subscriptions";
import { subscriptionInclude } from "../../../src/repositories/subscriptions/helpers";

const credentialFields = {
  passwordCiphertext: "cipher",
  passwordIv: "iv",
  passwordTag: "tag",
  keyVersion: 1,
  needsCredentialReset: false,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    serviceProviderId: "sp_123",
    countryId: "country_123",
    name: "Netflix Premium",
    email: "test@example.com",
    ...credentialFields,
    maxSlots: 4,
    expiresAt: null,
    renewalInfo: null,
    userPrice: new Prisma.Decimal("15.99"),
    currencyId: "currency_123",
    metadata: { plan: "premium" },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    country: null,
    _count: { subscriptionSlots: 1 },
    ...overrides,
  };
}

describe("PrismaSubscriptionRepository", () => {
  let repository: PrismaSubscriptionRepository;
  let mockPrisma: {
    subscription: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    repository = new PrismaSubscriptionRepository(
      mockPrisma as unknown as PrismaClient
    );
  });

  describe("create", () => {
    const createData = {
      serviceProviderId: "sp_123",
      name: "Netflix Premium",
      email: "test@example.com",
      ...credentialFields,
      maxSlots: 4,
      countryId: "country_123",
      userPrice: 15.99,
      currencyId: "currency_123",
      metadata: { plan: "premium" },
      isActive: true,
    };

    it("persists credential fields and maxSlots", async () => {
      mockPrisma.subscription.create.mockResolvedValue(row());

      const result = await repository.create(createData);

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: {
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
          expiresAt: undefined,
          renewalInfo: undefined,
          userPrice: 15.99,
          currencyId: "currency_123",
          metadata: { plan: "premium" },
          isActive: true,
        },
        include: subscriptionInclude,
      });
      expect(result).toBeInstanceOf(Subscription);
      expect(result.maxSlots).toBe(4);
      expect(result.passwordCiphertext).toBe("cipher");
      expect(result).not.toHaveProperty("passwordHash");
      expect(result).not.toHaveProperty("availableSlots");
    });

    it("defaults needsCredentialReset and isActive for minimal data", async () => {
      const minimal = {
        serviceProviderId: "sp_123",
        name: "Basic Netflix",
        email: "basic@example.com",
        ...credentialFields,
        needsCredentialReset: undefined,
        maxSlots: 1,
      };
      mockPrisma.subscription.create.mockResolvedValue(
        row({
          name: "Basic Netflix",
          email: "basic@example.com",
          maxSlots: 1,
          countryId: null,
          userPrice: null,
          currencyId: null,
          metadata: null,
        })
      );

      await repository.create(minimal);

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          maxSlots: 1,
          needsCredentialReset: false,
          isActive: true,
          passwordCiphertext: "cipher",
        }),
        include: subscriptionInclude,
      });
    });

    it("lets Prisma errors bubble up", async () => {
      mockPrisma.subscription.create.mockRejectedValue(
        new Error("Unique constraint failed")
      );

      await expect(repository.create(createData)).rejects.toThrow(
        "Unique constraint failed"
      );
    });
  });

  describe("findById", () => {
    it("loads the subscription with slot occupancy", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(row());

      const result = await repository.findById("sub_123");

      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: "sub_123" },
        include: subscriptionInclude,
      });
      expect(result).toBeInstanceOf(Subscription);
      expect(result?.occupiedSlots).toBe(1);
    });

    it("returns null when the subscription is missing", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(repository.findById("missing")).resolves.toBeNull();
    });
  });

  describe("findMany", () => {
    it("applies filters and the shared include", async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([row()]);
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await repository.findMany({
        page: 1,
        limit: 5,
        sortBy: "name",
        sortOrder: "asc",
        search: "Netflix",
        serviceProviderId: "sp_123",
        isActive: true,
        countryId: "country_123",
      });

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
        orderBy: { name: "asc" },
        include: subscriptionInclude,
      });
      expect(result.total).toBe(1);
      expect(result.subscriptions[0]).toBeInstanceOf(Subscription);
    });
  });

  describe("update", () => {
    it("writes credential fields and maxSlots", async () => {
      mockPrisma.subscription.update.mockResolvedValue(
        row({ name: "Netflix Premium Updated", maxSlots: 5 })
      );

      const result = await repository.update("sub_123", {
        name: "Netflix Premium Updated",
        maxSlots: 5,
        userPrice: 18.99,
        passwordCiphertext: "new-cipher",
        passwordIv: "new-iv",
        passwordTag: "new-tag",
        keyVersion: 1,
        needsCredentialReset: false,
      });

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub_123" },
        data: {
          countryId: undefined,
          name: "Netflix Premium Updated",
          email: undefined,
          passwordCiphertext: "new-cipher",
          passwordIv: "new-iv",
          passwordTag: "new-tag",
          keyVersion: 1,
          needsCredentialReset: false,
          maxSlots: 5,
          expiresAt: undefined,
          renewalInfo: undefined,
          userPrice: 18.99,
          currencyId: undefined,
          metadata: undefined,
          isActive: undefined,
        },
        include: subscriptionInclude,
      });
      expect(result.maxSlots).toBe(5);
      expect(result).not.toHaveProperty("passwordHash");
    });
  });

  describe("delete", () => {
    it("deletes by id", async () => {
      mockPrisma.subscription.delete.mockResolvedValue(row());

      await repository.delete("sub_123");

      expect(mockPrisma.subscription.delete).toHaveBeenCalledWith({
        where: { id: "sub_123" },
      });
    });
  });

  describe("existsByEmail", () => {
    it("excludes an id when one is provided", async () => {
      mockPrisma.subscription.count.mockResolvedValue(0);

      await expect(
        repository.existsByEmail("test@example.com", "sub_123")
      ).resolves.toBe(false);
      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: { email: "test@example.com", id: { not: "sub_123" } },
      });
    });
  });

  describe("findByServiceProviderId", () => {
    it("returns subscriptions for the provider", async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([row()]);

      const result = await repository.findByServiceProviderId("sp_123");

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: { serviceProviderId: "sp_123" },
        include: subscriptionInclude,
      });
      expect(result[0]).toBeInstanceOf(Subscription);
    });
  });

  describe("countByServiceProviderId", () => {
    it("counts subscriptions for the provider", async () => {
      mockPrisma.subscription.count.mockResolvedValue(3);

      await expect(repository.countByServiceProviderId("sp_123")).resolves.toBe(3);
      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: { serviceProviderId: "sp_123" },
      });
    });
  });
});
