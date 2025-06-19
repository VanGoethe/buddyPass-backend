/**
 * ServiceProvider Repository Integration Tests
 */

import { PrismaClient } from "@prisma/client";
import { PrismaServiceProviderRepository } from "../../../src/repositories/serviceProviders";
import { ServiceProvider } from "../../../src/models/serviceProviders";

// Create a mock Prisma client with proper typing
const createMockPrisma = () => {
  return {
    serviceProvider: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    serviceProviderCountry: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
};

describe("PrismaServiceProviderRepository", () => {
  let repository: PrismaServiceProviderRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repository = new PrismaServiceProviderRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createData = {
      name: "Netflix",
      description: "Streaming service",
      metadata: { category: "entertainment" },
    };

    const mockCreatedServiceProvider = {
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: { category: "entertainment" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should create a service provider successfully", async () => {
      // Mock the transaction to return the service provider
      mockPrisma.$transaction = mockTransaction(
        jest.fn().mockResolvedValue(mockCreatedServiceProvider)
      );

      const result = await repository.create(createData);

      expect(result).toBeInstanceOf(ServiceProvider);
      expect(result.id).toBe("sp_123");
      expect(result.name).toBe("Netflix");
    });

    it("should handle null description and metadata", async () => {
      const createDataMinimal = { name: "Netflix" };
      const mockCreatedMinimal = {
        ...mockCreatedServiceProvider,
        description: null,
        metadata: null,
      };

      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const transactionMock = {
          serviceProvider: {
            create: jest.fn().mockResolvedValue(mockCreatedMinimal),
          },
          serviceProviderCountry: {
            createMany: jest.fn(),
          },
        };
        return callback(transactionMock);
      });

      const result = await repository.create(createDataMinimal);

      expect(result.description).toBeNull();
      expect(result.metadata).toBeNull();
    });

    it("should throw error for duplicate name (P2002)", async () => {
      const error = new Error("Unique constraint failed");
      (error as any).code = "P2002";

      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(repository.create(createData)).rejects.toThrow(
        "A service provider with this name already exists"
      );
    });

    it("should throw generic error for other database errors", async () => {
      const error = new Error("Database connection failed");

      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(repository.create(createData)).rejects.toThrow(
        "Failed to create service provider: Database connection failed"
      );
    });
  });

  describe("findById", () => {
    const mockServiceProvider = {
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should find service provider by ID successfully", async () => {
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(
        mockServiceProvider
      );

      const result = await repository.findById("sp_123");

      expect(mockPrisma.serviceProvider.findUnique).toHaveBeenCalledWith({
        where: { id: "sp_123" },
        include: {},
      });
      expect(result).toBeInstanceOf(ServiceProvider);
      expect(result?.id).toBe("sp_123");
    });

    it("should return null if service provider not found", async () => {
      mockPrisma.serviceProvider.findUnique.mockResolvedValue(null);

      const result = await repository.findById("sp_nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error for database errors", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.serviceProvider.findUnique.mockRejectedValue(error);

      await expect(repository.findById("sp_123")).rejects.toThrow(
        "Failed to find service provider: Database connection failed"
      );
    });
  });

  describe("findMany", () => {
    const mockServiceProviders = [
      {
        id: "sp_1",
        name: "Netflix",
        description: "Streaming service",
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "sp_2",
        name: "Spotify",
        description: "Music streaming",
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should find many service providers with default options", async () => {
      mockPrisma.serviceProvider.findMany.mockResolvedValue(
        mockServiceProviders
      );
      mockPrisma.serviceProvider.count.mockResolvedValue(2);

      const result = await repository.findMany();

      expect(mockPrisma.serviceProvider.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          supportedCountries: {
            include: {
              country: true,
            },
          },
        },
      });
      expect(mockPrisma.serviceProvider.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(result.serviceProviders).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should find many service providers with custom options", async () => {
      const options = {
        page: 2,
        limit: 5,
        sortBy: "name" as const,
        sortOrder: "asc" as const,
        search: "Netflix",
      };

      mockPrisma.serviceProvider.findMany.mockResolvedValue([
        mockServiceProviders[0],
      ]);
      mockPrisma.serviceProvider.count.mockResolvedValue(1);

      const result = await repository.findMany(options);

      expect(mockPrisma.serviceProvider.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: "Netflix", mode: "insensitive" } },
            { description: { contains: "Netflix", mode: "insensitive" } },
          ],
        },
        skip: 5,
        take: 5,
        orderBy: {
          name: "asc",
        },
        include: {
          supportedCountries: {
            include: {
              country: true,
            },
          },
        },
      });
      expect(result.serviceProviders).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should cap limit at 100", async () => {
      const options = { limit: 150 };

      mockPrisma.serviceProvider.findMany.mockResolvedValue([]);
      mockPrisma.serviceProvider.count.mockResolvedValue(0);

      await repository.findMany(options);

      expect(mockPrisma.serviceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("should throw error for database errors", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.serviceProvider.findMany.mockRejectedValue(error);

      await expect(repository.findMany()).rejects.toThrow(
        "Failed to fetch service providers: Database connection failed"
      );
    });
  });

  describe("update", () => {
    const updateData = {
      name: "Netflix Updated",
      description: "Updated description",
      metadata: { category: "entertainment", updated: true },
    };

    const mockUpdatedServiceProvider = {
      id: "sp_123",
      name: "Netflix Updated",
      description: "Updated description",
      metadata: { category: "entertainment", updated: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should update service provider successfully", async () => {
      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const transactionMock = {
          serviceProvider: {
            update: jest.fn().mockResolvedValue(mockUpdatedServiceProvider),
          },
          serviceProviderCountry: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        };
        return callback(transactionMock);
      });

      const result = await repository.update("sp_123", updateData);

      expect(result).toBeInstanceOf(ServiceProvider);
      expect(result.name).toBe("Netflix Updated");
    });

    it("should handle partial updates", async () => {
      const partialUpdateData = { name: "Netflix Updated" };

      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const transactionMock = {
          serviceProvider: {
            update: jest.fn().mockResolvedValue(mockUpdatedServiceProvider),
          },
          serviceProviderCountry: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        };
        return callback(transactionMock);
      });

      await repository.update("sp_123", partialUpdateData);
    });

    it("should handle undefined values by not including them in update", async () => {
      const updateDataWithUndefined = {
        description: undefined,
        metadata: undefined,
      };

      mockPrisma.$transaction.mockImplementation((callback: any) => {
        const transactionMock = {
          serviceProvider: {
            update: jest.fn().mockResolvedValue(mockUpdatedServiceProvider),
          },
          serviceProviderCountry: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        };
        return callback(transactionMock);
      });

      await repository.update("sp_123", updateDataWithUndefined);
    });

    it("should throw error if service provider not found (P2025)", async () => {
      const error = new Error("Record not found");
      (error as any).code = "P2025";

      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(
        repository.update("sp_nonexistent", updateData)
      ).rejects.toThrow("Service provider not found");
    });

    it("should throw error for duplicate name (P2002)", async () => {
      const error = new Error("Unique constraint failed");
      (error as any).code = "P2002";

      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(repository.update("sp_123", updateData)).rejects.toThrow(
        "A service provider with this name already exists"
      );
    });
  });

  describe("delete", () => {
    it("should delete service provider successfully", async () => {
      mockPrisma.serviceProvider.delete.mockResolvedValue({} as any);

      await repository.delete("sp_123");

      expect(mockPrisma.serviceProvider.delete).toHaveBeenCalledWith({
        where: { id: "sp_123" },
      });
    });

    it("should throw error if service provider not found (P2025)", async () => {
      const error = new Error("Record not found");
      (error as any).code = "P2025";
      mockPrisma.serviceProvider.delete.mockRejectedValue(error);

      await expect(repository.delete("sp_nonexistent")).rejects.toThrow(
        "Service provider not found"
      );
    });

    it("should throw error if service provider has associated subscriptions (P2003)", async () => {
      const error = new Error("Foreign key constraint failed");
      (error as any).code = "P2003";
      mockPrisma.serviceProvider.delete.mockRejectedValue(error);

      await expect(repository.delete("sp_123")).rejects.toThrow(
        "Cannot delete service provider: it has associated subscriptions"
      );
    });
  });

  describe("existsByName", () => {
    it("should return true if service provider exists by name", async () => {
      mockPrisma.serviceProvider.count.mockResolvedValue(1);

      const result = await repository.existsByName("Netflix");

      expect(mockPrisma.serviceProvider.count).toHaveBeenCalledWith({
        where: {
          name: { equals: "Netflix", mode: "insensitive" },
        },
      });
      expect(result).toBe(true);
    });

    it("should return false if service provider does not exist by name", async () => {
      mockPrisma.serviceProvider.count.mockResolvedValue(0);

      const result = await repository.existsByName("NonExistent");

      expect(result).toBe(false);
    });

    it("should exclude specific ID when checking", async () => {
      mockPrisma.serviceProvider.count.mockResolvedValue(0);

      const result = await repository.existsByName("Netflix", "sp_123");

      expect(mockPrisma.serviceProvider.count).toHaveBeenCalledWith({
        where: {
          name: { equals: "Netflix", mode: "insensitive" },
          id: { not: "sp_123" },
        },
      });
      expect(result).toBe(false);
    });

    it("should throw error for database errors", async () => {
      const error = new Error("Database connection failed");
      mockPrisma.serviceProvider.count.mockRejectedValue(error);

      await expect(repository.existsByName("Netflix")).rejects.toThrow(
        "Failed to check service provider name: Database connection failed"
      );
    });
  });
});
