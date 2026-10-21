import { NextFunction, Request, Response } from "express";
import { ServiceProviderController } from "../../../src/controllers/serviceProviders";
import { IServiceProviderService } from "../../../src/types/serviceProviders";
import { ConflictError, ValidationError } from "../../../src/utils/errors";

const mockService: jest.Mocked<IServiceProviderService> = {
  createServiceProvider: jest.fn(),
  getServiceProviderById: jest.fn(),
  getServiceProviders: jest.fn(),
  updateServiceProvider: jest.fn(),
  deleteServiceProvider: jest.fn(),
};

describe("ServiceProviderController", () => {
  let controller: ServiceProviderController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  const serviceProvider = {
    id: "sp_123",
    name: "Disney+",
    description: "Streaming service",
    metadata: { category: "Entertainment" },
    supportedCountries: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ServiceProviderController(mockService);
    req = { body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("createServiceProvider", () => {
    it("returns the created provider without a timestamp", async () => {
      req.body = {
        name: "Disney+",
        description: "Streaming service",
        metadata: { category: "Entertainment" },
      };
      mockService.createServiceProvider.mockResolvedValue(serviceProvider);

      await controller.createServiceProvider(
        req as Request,
        res as Response,
        next
      );

      expect(mockService.createServiceProvider).toHaveBeenCalledWith({
        name: "Disney+",
        description: "Streaming service",
        metadata: { category: "Entertainment" },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Service provider created successfully",
        data: { serviceProvider },
      });
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: expect.anything() })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards service errors to next", async () => {
      req.body = { name: "Disney+" };
      const error = new ConflictError(
        "A service provider with this name already exists"
      );
      mockService.createServiceProvider.mockRejectedValue(error);

      await controller.createServiceProvider(
        req as Request,
        res as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("getServiceProviderById", () => {
    it("returns the provider", async () => {
      req.params = { id: "sp_123" };
      mockService.getServiceProviderById.mockResolvedValue(serviceProvider);

      await controller.getServiceProviderById(
        req as Request,
        res as Response,
        next
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { serviceProvider },
      });
    });

    it("forwards a missing provider to next", async () => {
      req.params = { id: "missing" };
      const error = new Error("Service provider not found");
      mockService.getServiceProviderById.mockRejectedValue(error);

      await controller.getServiceProviderById(
        req as Request,
        res as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getServiceProviders", () => {
    it("parses list query parameters", async () => {
      req.query = {
        page: "2",
        limit: "5",
        sortBy: "name",
        sortOrder: "asc",
        search: "Disney",
      };
      const result = {
        serviceProviders: [serviceProvider],
        pagination: {
          total: 1,
          page: 2,
          limit: 5,
          totalPages: 1,
          hasNext: false,
          hasPrevious: true,
        },
      };
      mockService.getServiceProviders.mockResolvedValue(result);

      await controller.getServiceProviders(req as Request, res as Response, next);

      expect(mockService.getServiceProviders).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        sortBy: "name",
        sortOrder: "asc",
        search: "Disney",
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: result,
      });
    });
  });

  describe("updateServiceProvider", () => {
    it("returns the updated provider", async () => {
      req.params = { id: "sp_123" };
      req.body = { name: "Disney+ Premium" };
      const updated = { ...serviceProvider, name: "Disney+ Premium" };
      mockService.updateServiceProvider.mockResolvedValue(updated);

      await controller.updateServiceProvider(
        req as Request,
        res as Response,
        next
      );

      expect(mockService.updateServiceProvider).toHaveBeenCalledWith("sp_123", {
        name: "Disney+ Premium",
        description: undefined,
        metadata: undefined,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Service provider updated successfully",
        data: { serviceProvider: updated },
      });
    });
  });

  describe("deleteServiceProvider", () => {
    it("confirms deletion", async () => {
      req.params = { id: "sp_123" };
      mockService.deleteServiceProvider.mockResolvedValue();

      await controller.deleteServiceProvider(
        req as Request,
        res as Response,
        next
      );

      expect(mockService.deleteServiceProvider).toHaveBeenCalledWith("sp_123");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Service provider deleted successfully",
        data: undefined,
      });
    });
  });

  describe("validation handlers", () => {
    it("rejects a create body without a name", () => {
      req.body = { description: "Missing name" };

      ServiceProviderController.createValidation[0](
        req as Request,
        res as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as unknown as ValidationError;
      expect(error.details).toEqual(expect.arrayContaining(["Name is required"]));
      expect(mockService.createServiceProvider).not.toHaveBeenCalled();
    });

    it("rejects an invalid list query", () => {
      req.query = { page: "0", sortBy: "email" };

      ServiceProviderController.getListValidation[0](
        req as Request,
        res as Response,
        next
      );

      const error = next.mock.calls[0][0] as unknown as ValidationError;
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Invalid query parameters");
    });
  });
});
