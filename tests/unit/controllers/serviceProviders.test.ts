/**
 * ServiceProvider Controller Unit Tests
 */

import { Request, Response } from "express";
import { ServiceProviderController } from "../../../src/controllers/serviceProviders";
import { IServiceProviderService } from "../../../src/types/serviceProviders";

// Mock express-validator before importing controller
jest.mock("express-validator", () => ({
  validationResult: jest.fn(),
  body: jest.fn(() => ({
    notEmpty: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
  })),
  param: jest.fn(() => ({
    notEmpty: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
  })),
  query: jest.fn(() => ({
    optional: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
  })),
}));

const { validationResult } = require("express-validator");

// Mock the service
const mockServiceProviderService: jest.Mocked<IServiceProviderService> = {
  createServiceProvider: jest.fn(),
  getServiceProviderById: jest.fn(),
  getServiceProviders: jest.fn(),
  updateServiceProvider: jest.fn(),
  deleteServiceProvider: jest.fn(),
};

describe("ServiceProviderController", () => {
  let controller: ServiceProviderController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockValidationResult: jest.MockedFunction<typeof validationResult>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ServiceProviderController(mockServiceProviderService);

    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockValidationResult = validationResult as jest.MockedFunction<
      typeof validationResult
    >;
  });

  describe("createServiceProvider", () => {
    const mockServiceProviderResponse = {
      id: "sp_123",
      name: "Disney+",
      description: "Streaming service",
      metadata: { category: "Entertainment" },
      createdAt: "2025-06-04T21:00:00.000Z",
      updatedAt: "2025-06-04T21:00:00.000Z",
    };

    beforeEach(() => {
      mockRequest.body = {
        name: "Disney+",
        description: "Streaming service",
        metadata: { category: "Entertainment" },
      };
    });

    it("should create service provider successfully with correct response format", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.createServiceProvider.mockResolvedValue(
        mockServiceProviderResponse
      );

      await controller.createServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(
        mockServiceProviderService.createServiceProvider
      ).toHaveBeenCalledWith({
        name: "Disney+",
        description: "Streaming service",
        metadata: { category: "Entertainment" },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          serviceProvider: mockServiceProviderResponse,
        },
        message: "Service provider created successfully",
      });
    });

    it("should return validation error when validation fails", async () => {
      const validationErrors = [
        {
          path: "name",
          msg: "Name is required",
          value: "",
        },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => validationErrors,
      } as any);

      await controller.createServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(
        mockServiceProviderService.createServiceProvider
      ).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: validationErrors,
        },
      });
    });

    it("should return conflict error when service provider already exists", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.createServiceProvider.mockRejectedValue(
        new Error("A service provider with this name already exists")
      );

      await controller.createServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A service provider with this name already exists",
        },
      });
    });

    it("should return internal error for unexpected errors", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      const unexpectedError = new Error("Database connection failed");
      mockServiceProviderService.createServiceProvider.mockRejectedValue(
        unexpectedError
      );

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await controller.createServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Service provider creation error:",
        unexpectedError
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create service provider",
          details: undefined, // Should be undefined in test environment
        },
      });

      consoleSpy.mockRestore();
    });

    it("should include error details in development mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      const unexpectedError = new Error("Database connection failed");
      mockServiceProviderService.createServiceProvider.mockRejectedValue(
        unexpectedError
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await controller.createServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create service provider",
          details: "Database connection failed",
        },
      });

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("getServiceProviderById", () => {
    const mockServiceProviderResponse = {
      id: "sp_123",
      name: "Disney+",
      description: "Streaming service",
      metadata: null,
      createdAt: "2025-06-04T21:00:00.000Z",
      updatedAt: "2025-06-04T21:00:00.000Z",
    };

    beforeEach(() => {
      mockRequest.params = { id: "sp_123" };
    });

    it("should get service provider by ID with correct response format", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.getServiceProviderById.mockResolvedValue(
        mockServiceProviderResponse
      );

      await controller.getServiceProviderById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(
        mockServiceProviderService.getServiceProviderById
      ).toHaveBeenCalledWith("sp_123");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          serviceProvider: mockServiceProviderResponse,
        },
      });
    });

    it("should return 404 when service provider not found", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.getServiceProviderById.mockRejectedValue(
        new Error("Service provider not found")
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await controller.getServiceProviderById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Service provider not found",
        },
      });

      consoleSpy.mockRestore();
    });
  });

  describe("getServiceProviders", () => {
    const mockServiceProvidersResponse = {
      serviceProviders: [
        {
          id: "sp_1",
          name: "Netflix",
          description: "Streaming service",
          metadata: null,
          createdAt: "2025-06-04T21:00:00.000Z",
          updatedAt: "2025-06-04T21:00:00.000Z",
        },
        {
          id: "sp_2",
          name: "Spotify",
          description: "Music service",
          metadata: null,
          createdAt: "2025-06-04T21:00:00.000Z",
          updatedAt: "2025-06-04T21:00:00.000Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrevious: false,
    };

    beforeEach(() => {
      mockRequest.query = {
        page: "1",
        limit: "10",
        sortBy: "createdAt",
        sortOrder: "desc",
      };
    });

    it("should get service providers with pagination", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.getServiceProviders.mockResolvedValue(
        mockServiceProvidersResponse
      );

      await controller.getServiceProviders(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(
        mockServiceProviderService.getServiceProviders
      ).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: undefined,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockServiceProvidersResponse,
      });
    });

    it("should handle query parameter parsing", async () => {
      mockRequest.query = {
        page: "2",
        limit: "5",
        sortBy: "name",
        sortOrder: "asc",
        search: "Netflix",
      };

      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.getServiceProviders.mockResolvedValue(
        mockServiceProvidersResponse
      );

      await controller.getServiceProviders(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(
        mockServiceProviderService.getServiceProviders
      ).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        sortBy: "name",
        sortOrder: "asc",
        search: "Netflix",
      });
    });
  });

  describe("updateServiceProvider", () => {
    const mockUpdatedServiceProvider = {
      id: "sp_123",
      name: "Disney+ Updated",
      description: "Updated streaming service",
      metadata: { category: "Entertainment", updated: true },
      createdAt: "2025-06-04T21:00:00.000Z",
      updatedAt: "2025-06-04T21:05:00.000Z",
    };

    beforeEach(() => {
      mockRequest.params = { id: "sp_123" };
      mockRequest.body = {
        name: "Disney+ Updated",
        description: "Updated streaming service",
        metadata: { category: "Entertainment", updated: true },
      };
    });

    it("should update service provider with correct response format", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.updateServiceProvider.mockResolvedValue(
        mockUpdatedServiceProvider
      );

      await controller.updateServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(
        mockServiceProviderService.updateServiceProvider
      ).toHaveBeenCalledWith("sp_123", {
        name: "Disney+ Updated",
        description: "Updated streaming service",
        metadata: { category: "Entertainment", updated: true },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          serviceProvider: mockUpdatedServiceProvider,
        },
        message: "Service provider updated successfully",
      });
    });

    it("should return 404 when service provider not found for update", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.updateServiceProvider.mockRejectedValue(
        new Error("Service provider not found")
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await controller.updateServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Service provider not found",
        },
      });

      consoleSpy.mockRestore();
    });

    it("should return 409 when updated name already exists", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.updateServiceProvider.mockRejectedValue(
        new Error("A service provider with this name already exists")
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await controller.updateServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A service provider with this name already exists",
        },
      });

      consoleSpy.mockRestore();
    });
  });

  describe("deleteServiceProvider", () => {
    beforeEach(() => {
      mockRequest.params = { id: "sp_123" };
    });

    it("should delete service provider successfully", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.deleteServiceProvider.mockResolvedValue();

      await controller.deleteServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(
        mockServiceProviderService.deleteServiceProvider
      ).toHaveBeenCalledWith("sp_123");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Service provider deleted successfully",
      });
    });

    it("should return 404 when service provider not found for deletion", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.deleteServiceProvider.mockRejectedValue(
        new Error("Service provider not found")
      );

      await controller.deleteServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Service provider not found",
        },
      });
    });

    it("should return 409 when service provider has associated subscriptions", async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      } as any);

      mockServiceProviderService.deleteServiceProvider.mockRejectedValue(
        new Error(
          "Cannot delete service provider: it has associated subscriptions"
        )
      );

      await controller.deleteServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "CONFLICT",
          message:
            "Cannot delete service provider: it has associated subscriptions",
        },
      });
    });
  });

  describe("Validation Edge Cases", () => {
    it("should handle complex validation errors", async () => {
      const complexValidationErrors = [
        {
          path: "name",
          msg: "Name is required",
          value: "",
        },
        {
          path: "description",
          msg: "Description must be 500 characters or less",
          value: "a".repeat(501),
        },
        {
          path: "metadata",
          msg: "Metadata must be a valid JSON object",
          value: "invalid-json",
        },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => complexValidationErrors,
      } as any);

      await controller.createServiceProvider(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: complexValidationErrors,
        },
      });
    });
  });
});
