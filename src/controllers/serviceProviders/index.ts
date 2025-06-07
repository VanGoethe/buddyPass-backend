/**
 * ServiceProvider Controller Implementation
 */

import { Request, Response } from "express";
import { body, query, param, validationResult } from "express-validator";
import { IServiceProviderService } from "../../types/serviceProviders";

export class ServiceProviderController {
  constructor(private serviceProviderService: IServiceProviderService) {}

  /**
   * Validation rules for creating a service provider
   */
  static createValidation = [
    body("name")
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ max: 100 })
      .withMessage("Name must be 100 characters or less")
      .trim(),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be 500 characters or less")
      .trim(),
    body("metadata")
      .optional()
      .custom((value) => {
        if (value && typeof value !== "object") {
          throw new Error("Metadata must be a valid JSON object");
        }
        if (value) {
          try {
            JSON.stringify(value);
          } catch (err) {
            throw new Error("Metadata contains invalid JSON values");
          }
        }
        return true;
      }),
  ];

  /**
   * Validation rules for updating a service provider
   */
  static updateValidation = [
    param("id").notEmpty().withMessage("Service provider ID is required"),
    body("name")
      .optional()
      .notEmpty()
      .withMessage("Name cannot be empty")
      .isLength({ max: 100 })
      .withMessage("Name must be 100 characters or less")
      .trim(),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be 500 characters or less")
      .trim(),
    body("metadata")
      .optional()
      .custom((value) => {
        if (value && typeof value !== "object") {
          throw new Error("Metadata must be a valid JSON object");
        }
        if (value) {
          try {
            JSON.stringify(value);
          } catch (err) {
            throw new Error("Metadata contains invalid JSON values");
          }
        }
        return true;
      }),
  ];

  /**
   * Validation rules for getting service providers
   */
  static getListValidation = [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("sortBy")
      .optional()
      .isIn(["name", "createdAt", "updatedAt"])
      .withMessage("sortBy must be one of: name, createdAt, updatedAt"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("sortOrder must be either asc or desc"),
    query("search")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Search term must be 100 characters or less")
      .trim(),
  ];

  /**
   * Validation rules for getting a single service provider
   */
  static getByIdValidation = [
    param("id").notEmpty().withMessage("Service provider ID is required"),
  ];

  /**
   * Validation rules for deleting a service provider
   */
  static deleteValidation = [
    param("id").notEmpty().withMessage("Service provider ID is required"),
  ];

  /**
   * Create a new service provider
   */
  async createServiceProvider(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
        return;
      }

      const { name, description, metadata } = req.body;

      const serviceProvider =
        await this.serviceProviderService.createServiceProvider({
          name,
          description,
          metadata,
        });

      res.status(201).json({
        success: true,
        data: {
          serviceProvider,
        },
        message: "Service provider created successfully",
      });
    } catch (error: any) {
      console.error("Service provider creation error:", error);

      if (error.message.includes("already exists")) {
        res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to create service provider",
            details:
              process.env.NODE_ENV === "development"
                ? error.message
                : undefined,
          },
        });
      }
    }
  }

  /**
   * Get a service provider by ID
   */
  async getServiceProviderById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
        return;
      }

      const { id } = req.params;

      const serviceProvider =
        await this.serviceProviderService.getServiceProviderById(id);

      res.status(200).json({
        success: true,
        data: {
          serviceProvider,
        },
      });
    } catch (error: any) {
      console.error("Service provider retrieval error:", error);

      if (error.message === "Service provider not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to get service provider",
            details:
              process.env.NODE_ENV === "development"
                ? error.message
                : undefined,
          },
        });
      }
    }
  }

  /**
   * Get list of service providers with pagination
   */
  async getServiceProviders(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: errors.array(),
          },
        });
        return;
      }

      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
      } = req.query;

      const result = await this.serviceProviderService.getServiceProviders({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        sortBy: sortBy as "name" | "createdAt" | "updatedAt",
        sortOrder: sortOrder as "asc" | "desc",
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get service providers",
        },
      });
    }
  }

  /**
   * Update a service provider
   */
  async updateServiceProvider(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
        return;
      }

      const { id } = req.params;
      const { name, description, metadata } = req.body;

      const serviceProvider =
        await this.serviceProviderService.updateServiceProvider(id, {
          name,
          description,
          metadata,
        });

      res.status(200).json({
        success: true,
        data: {
          serviceProvider,
        },
        message: "Service provider updated successfully",
      });
    } catch (error: any) {
      console.error("Service provider update error:", error);

      if (error.message === "Service provider not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        });
      } else if (error.message.includes("already exists")) {
        res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to update service provider",
            details:
              process.env.NODE_ENV === "development"
                ? error.message
                : undefined,
          },
        });
      }
    }
  }

  /**
   * Delete a service provider
   */
  async deleteServiceProvider(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
        return;
      }

      const { id } = req.params;

      await this.serviceProviderService.deleteServiceProvider(id);

      res.status(200).json({
        success: true,
        message: "Service provider deleted successfully",
      });
    } catch (error: any) {
      if (error.message === "Service provider not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        });
      } else if (error.message.includes("associated subscriptions")) {
        res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to delete service provider",
          },
        });
      }
    }
  }
}

/**
 * Factory function to create ServiceProvider controller
 */
export function createServiceProviderController(
  serviceProviderService: IServiceProviderService
): ServiceProviderController {
  return new ServiceProviderController(serviceProviderService);
}
