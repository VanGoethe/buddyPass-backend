/**
 * ServiceProvider Service Unit Tests
 */

import { ServiceProviderService } from "../../../src/services/serviceProviders";
import { IServiceProviderRepository } from "../../../src/types/serviceProviders";
import { ICountryRepository } from "../../../src/types/countries";
import { ServiceProvider } from "../../../src/models/serviceProviders";

// Mock the repositories
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

describe("ServiceProviderService", () => {
  let serviceProviderService: ServiceProviderService;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceProviderService = new ServiceProviderService(
      mockServiceProviderRepository,
      mockCountryRepository
    );
  });

  describe("createServiceProvider", () => {
    const validCreateData = {
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
      mockServiceProviderRepository.existsByName.mockResolvedValue(false);
      mockServiceProviderRepository.create.mockResolvedValue(
        mockCreatedServiceProvider
      );
      // Mock the second findById call for retrieving with countries
      mockServiceProviderRepository.findById.mockResolvedValue(
        mockCreatedServiceProvider
      );

      const result = await serviceProviderService.createServiceProvider(
        validCreateData
      );

      expect(mockServiceProviderRepository.existsByName).toHaveBeenCalledWith(
        "Netflix"
      );
      expect(mockServiceProviderRepository.create).toHaveBeenCalledWith(
        validCreateData
      );
      expect(result).toEqual({
        id: "sp_123",
        name: "Netflix",
        description: "Streaming service",
        metadata: { category: "entertainment" },
        supportedCountries: [],
        createdAt: mockCreatedServiceProvider.createdAt.toISOString(),
        updatedAt: mockCreatedServiceProvider.updatedAt.toISOString(),
      });
    });

    it("should throw error if name is empty", async () => {
      const invalidData = { ...validCreateData, name: "" };

      await expect(
        serviceProviderService.createServiceProvider(invalidData)
      ).rejects.toThrow("Service provider name is required");

      expect(mockServiceProviderRepository.existsByName).not.toHaveBeenCalled();
      expect(mockServiceProviderRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error if name is too long", async () => {
      const invalidData = { ...validCreateData, name: "a".repeat(101) };

      await expect(
        serviceProviderService.createServiceProvider(invalidData)
      ).rejects.toThrow("Service provider name must be 100 characters or less");

      expect(mockServiceProviderRepository.existsByName).not.toHaveBeenCalled();
      expect(mockServiceProviderRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error if description is too long", async () => {
      const invalidData = { ...validCreateData, description: "a".repeat(501) };

      await expect(
        serviceProviderService.createServiceProvider(invalidData)
      ).rejects.toThrow(
        "Service provider description must be 500 characters or less"
      );

      expect(mockServiceProviderRepository.existsByName).not.toHaveBeenCalled();
      expect(mockServiceProviderRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error if name already exists", async () => {
      mockServiceProviderRepository.existsByName.mockResolvedValue(true);

      await expect(
        serviceProviderService.createServiceProvider(validCreateData)
      ).rejects.toThrow("A service provider with this name already exists");

      expect(mockServiceProviderRepository.existsByName).toHaveBeenCalledWith(
        "Netflix"
      );
      expect(mockServiceProviderRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getServiceProviderById", () => {
    const mockServiceProvider = {
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return service provider successfully", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue(
        mockServiceProvider
      );

      const result = await serviceProviderService.getServiceProviderById(
        "sp_123"
      );

      expect(mockServiceProviderRepository.findById).toHaveBeenCalledWith(
        "sp_123",
        true
      );
      expect(result).toEqual({
        id: "sp_123",
        name: "Netflix",
        description: "Streaming service",
        metadata: null,
        supportedCountries: [],
        createdAt: mockServiceProvider.createdAt.toISOString(),
        updatedAt: mockServiceProvider.updatedAt.toISOString(),
      });
    });

    it("should throw error if ID is empty", async () => {
      await expect(
        serviceProviderService.getServiceProviderById("")
      ).rejects.toThrow("Service provider ID is required");

      expect(mockServiceProviderRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw error if service provider not found", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue(null);

      await expect(
        serviceProviderService.getServiceProviderById("sp_nonexistent")
      ).rejects.toThrow("Service provider not found");

      expect(mockServiceProviderRepository.findById).toHaveBeenCalledWith(
        "sp_nonexistent",
        true
      );
    });
  });

  describe("getServiceProviders", () => {
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

    it("should return paginated service providers", async () => {
      mockServiceProviderRepository.findMany.mockResolvedValue({
        serviceProviders: mockServiceProviders,
        total: 2,
      });

      const result = await serviceProviderService.getServiceProviders({
        page: 1,
        limit: 10,
      });

      expect(mockServiceProviderRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result.serviceProviders).toHaveLength(2);
      expect(result.serviceProviders[0]).toMatchObject({
        id: mockServiceProviders[0].id,
        name: mockServiceProviders[0].name,
        description: mockServiceProviders[0].description?.toString(),
      });
      expect(result.serviceProviders[1]).toMatchObject({
        id: mockServiceProviders[1].id,
        name: mockServiceProviders[1].name,
        description: mockServiceProviders[1].description?.toString(),
      });
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it("should return default pagination if no options provided", async () => {
      mockServiceProviderRepository.findMany.mockResolvedValue({
        serviceProviders: [],
        total: 0,
      });

      const result = await serviceProviderService.getServiceProviders();

      expect(mockServiceProviderRepository.findMany).toHaveBeenCalledWith({});
      expect(result.serviceProviders).toHaveLength(0);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it("should throw error if page is less than 1", async () => {
      await expect(
        serviceProviderService.getServiceProviders({ page: 0 })
      ).rejects.toThrow("Page number must be greater than 0");

      expect(mockServiceProviderRepository.findMany).not.toHaveBeenCalled();
    });

    it("should throw error if limit is invalid", async () => {
      await expect(
        serviceProviderService.getServiceProviders({ limit: 101 })
      ).rejects.toThrow("Limit must be between 1 and 100");

      expect(mockServiceProviderRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe("updateServiceProvider", () => {
    const mockExistingServiceProvider = {
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateData = {
      name: "Netflix Updated",
      description: "Updated description",
    };

    const mockUpdatedServiceProvider = {
      ...mockExistingServiceProvider,
      name: "Netflix Updated",
      description: "Updated description",
      updatedAt: new Date(),
    };

    it("should update service provider successfully", async () => {
      // Mock first findById call (existence check)
      mockServiceProviderRepository.findById
        .mockResolvedValueOnce(mockExistingServiceProvider)
        // Mock second findById call (get updated data with countries)
        .mockResolvedValueOnce(mockUpdatedServiceProvider);

      mockServiceProviderRepository.existsByName.mockResolvedValue(false);
      mockServiceProviderRepository.update.mockResolvedValue(
        mockUpdatedServiceProvider
      );

      const result = await serviceProviderService.updateServiceProvider(
        "sp_123",
        updateData
      );

      expect(mockServiceProviderRepository.findById).toHaveBeenNthCalledWith(
        1,
        "sp_123"
      );
      expect(mockServiceProviderRepository.findById).toHaveBeenNthCalledWith(
        2,
        "sp_123",
        true
      );
      expect(mockServiceProviderRepository.existsByName).toHaveBeenCalledWith(
        "Netflix Updated",
        "sp_123"
      );
      expect(mockServiceProviderRepository.update).toHaveBeenCalledWith(
        "sp_123",
        updateData
      );
      expect(result.name).toBe("Netflix Updated");
    });

    it("should throw error if ID is empty", async () => {
      await expect(
        serviceProviderService.updateServiceProvider("", updateData)
      ).rejects.toThrow("Service provider ID is required");

      expect(mockServiceProviderRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw error if service provider not found", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue(null);

      await expect(
        serviceProviderService.updateServiceProvider(
          "sp_nonexistent",
          updateData
        )
      ).rejects.toThrow("Service provider not found");

      expect(mockServiceProviderRepository.findById).toHaveBeenCalledWith(
        "sp_nonexistent"
      );
      expect(mockServiceProviderRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error if new name already exists", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue(
        mockExistingServiceProvider
      );
      mockServiceProviderRepository.existsByName.mockResolvedValue(true);

      await expect(
        serviceProviderService.updateServiceProvider("sp_123", updateData)
      ).rejects.toThrow("A service provider with this name already exists");

      expect(mockServiceProviderRepository.existsByName).toHaveBeenCalledWith(
        "Netflix Updated",
        "sp_123"
      );
      expect(mockServiceProviderRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteServiceProvider", () => {
    const mockServiceProvider = {
      id: "sp_123",
      name: "Netflix",
      description: "Streaming service",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should delete service provider successfully", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue(
        mockServiceProvider
      );
      mockServiceProviderRepository.delete.mockResolvedValue();

      await serviceProviderService.deleteServiceProvider("sp_123");

      expect(mockServiceProviderRepository.findById).toHaveBeenCalledWith(
        "sp_123"
      );
      expect(mockServiceProviderRepository.delete).toHaveBeenCalledWith(
        "sp_123"
      );
    });

    it("should throw error if ID is empty", async () => {
      await expect(
        serviceProviderService.deleteServiceProvider("")
      ).rejects.toThrow("Service provider ID is required");

      expect(mockServiceProviderRepository.findById).not.toHaveBeenCalled();
      expect(mockServiceProviderRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw error if service provider not found", async () => {
      mockServiceProviderRepository.findById.mockResolvedValue(null);

      await expect(
        serviceProviderService.deleteServiceProvider("sp_nonexistent")
      ).rejects.toThrow("Service provider not found");

      expect(mockServiceProviderRepository.findById).toHaveBeenCalledWith(
        "sp_nonexistent"
      );
      expect(mockServiceProviderRepository.delete).not.toHaveBeenCalled();
    });
  });
});
