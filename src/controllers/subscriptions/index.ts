/**
 * Subscription Controller Implementation
 */

import { Request, Response } from "express";
import { body, query, param, validationResult } from "express-validator";
import { ISubscriptionService } from "../../types/subscriptions";

export class SubscriptionController {
  constructor(private subscriptionService: ISubscriptionService) {}

  /**
   * Validation rules for creating a subscription
   */
  static createValidation = [
    body("serviceProviderId")
      .notEmpty()
      .withMessage("Service provider ID is required"),
    body("name")
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ max: 100 })
      .withMessage("Name must be 100 characters or less")
      .trim(),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("availableSlots")
      .isInt({ min: 1, max: 100 })
      .withMessage("Available slots must be between 1 and 100"),
    body("countryId")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Country must be 50 characters or less")
      .trim(),
    body("expiresAt")
      .optional()
      .isISO8601()
      .withMessage("Expires at must be a valid date")
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error("Expiration date must be in the future");
        }
        return true;
      }),
    body("renewalInfo")
      .optional()
      .custom((value) => {
        if (value && typeof value !== "object") {
          throw new Error("Renewal info must be a valid JSON object");
        }
        return true;
      }),
    body("userPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("User price must be a positive number"),
    body("currency")
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage("Currency must be a 3-letter code"),
    body("metadata")
      .optional()
      .custom((value) => {
        if (value && typeof value !== "object") {
          throw new Error("Metadata must be a valid JSON object");
        }
        return true;
      }),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ];

  /**
   * Validation rules for updating a subscription
   */
  static updateValidation = [
    param("id").notEmpty().withMessage("Subscription ID is required"),
    body("name")
      .optional()
      .notEmpty()
      .withMessage("Name cannot be empty")
      .isLength({ max: 100 })
      .withMessage("Name must be 100 characters or less")
      .trim(),
    body("email")
      .optional()
      .notEmpty()
      .withMessage("Email cannot be empty")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("password")
      .optional()
      .notEmpty()
      .withMessage("Password cannot be empty")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("availableSlots")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Available slots must be between 1 and 100"),
    body("countryId")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Country must be 50 characters or less")
      .trim(),
    body("expiresAt")
      .optional()
      .isISO8601()
      .withMessage("Expires at must be a valid date")
      .custom((value) => {
        if (value && new Date(value) <= new Date()) {
          throw new Error("Expiration date must be in the future");
        }
        return true;
      }),
    body("renewalInfo")
      .optional()
      .custom((value) => {
        if (value && typeof value !== "object") {
          throw new Error("Renewal info must be a valid JSON object");
        }
        return true;
      }),
    body("userPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("User price must be a positive number"),
    body("currency")
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage("Currency must be a 3-letter code"),
    body("metadata")
      .optional()
      .custom((value) => {
        if (value && typeof value !== "object") {
          throw new Error("Metadata must be a valid JSON object");
        }
        return true;
      }),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ];

  /**
   * Validation rules for getting subscriptions
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
      .isIn([
        "name",
        "email",
        "availableSlots",
        "expiresAt",
        "createdAt",
        "updatedAt",
      ])
      .withMessage(
        "sortBy must be one of: name, email, availableSlots, expiresAt, createdAt, updatedAt"
      ),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("sortOrder must be either asc or desc"),
    query("search")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Search term must be 100 characters or less")
      .trim(),
    query("serviceProviderId")
      .optional()
      .notEmpty()
      .withMessage("Service provider ID cannot be empty"),
    query("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    query("countryId")
      .optional()
      .isLength({ max: 50 })
      .withMessage("Country must be 50 characters or less"),
  ];

  /**
   * Validation rules for getting a single subscription
   */
  static getByIdValidation = [
    param("id").notEmpty().withMessage("Subscription ID is required"),
  ];

  /**
   * Validation rules for deleting a subscription
   */
  static deleteValidation = [
    param("id").notEmpty().withMessage("Subscription ID is required"),
  ];

  /**
   * Validation rules for getting subscriptions by service provider
   */
  static getByServiceProviderValidation = [
    param("serviceProviderId")
      .notEmpty()
      .withMessage("Service provider ID is required"),
  ];

  /**
   * Create a new subscription
   */
  async createSubscription(req: Request, res: Response): Promise<void> {
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

      const {
        serviceProviderId,
        name,
        email,
        password,
        availableSlots,
        countryId,
        expiresAt,
        renewalInfo,
        userPrice,
        currency,
        metadata,
        isActive,
      } = req.body;

      const subscription = await this.subscriptionService.createSubscription({
        serviceProviderId,
        name,
        email,
        password,
        availableSlots,
        countryId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        renewalInfo,
        userPrice,
        currency,
        metadata,
        isActive,
      });

      res.status(201).json({
        success: true,
        data: subscription,
        message: "Subscription created successfully",
      });
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: error.message,
          },
        });
      } else if (error.message === "Service provider not found") {
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
            message: "Failed to create subscription",
          },
        });
      }
    }
  }

  /**
   * Get a subscription by ID
   */
  async getSubscriptionById(req: Request, res: Response): Promise<void> {
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

      const subscription = await this.subscriptionService.getSubscriptionById(
        id
      );

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      if (error.message === "Subscription not found") {
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
            message: "Failed to get subscription",
          },
        });
      }
    }
  }

  /**
   * Get list of subscriptions with pagination and filtering
   */
  async getSubscriptions(req: Request, res: Response): Promise<void> {
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
        serviceProviderId,
        isActive,
        countryId,
      } = req.query;

      const result = await this.subscriptionService.getSubscriptions({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        sortBy: sortBy as any,
        sortOrder: sortOrder as "asc" | "desc",
        search: search as string,
        serviceProviderId: serviceProviderId as string,
        isActive: isActive ? isActive === "true" : undefined,
        countryId: countryId as string,
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
          message: "Failed to get subscriptions",
        },
      });
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
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
      const {
        name,
        email,
        password,
        availableSlots,
        countryId,
        expiresAt,
        renewalInfo,
        userPrice,
        currency,
        metadata,
        isActive,
      } = req.body;

      const subscription = await this.subscriptionService.updateSubscription(
        id,
        {
          name,
          email,
          password,
          availableSlots,
          countryId,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          renewalInfo,
          userPrice,
          currency,
          metadata,
          isActive,
        }
      );

      res.status(200).json({
        success: true,
        data: subscription,
        message: "Subscription updated successfully",
      });
    } catch (error: any) {
      if (error.message === "Subscription not found") {
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
            message: "Failed to update subscription",
          },
        });
      }
    }
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(req: Request, res: Response): Promise<void> {
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

      await this.subscriptionService.deleteSubscription(id);

      res.status(200).json({
        success: true,
        message: "Subscription deleted successfully",
      });
    } catch (error: any) {
      if (error.message === "Subscription not found") {
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
            message: "Failed to delete subscription",
          },
        });
      }
    }
  }

  /**
   * Get subscriptions by service provider
   */
  async getSubscriptionsByServiceProvider(
    req: Request,
    res: Response
  ): Promise<void> {
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

      const { serviceProviderId } = req.params;

      const subscriptions =
        await this.subscriptionService.getSubscriptionsByServiceProvider(
          serviceProviderId
        );

      res.status(200).json({
        success: true,
        data: subscriptions,
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
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to get subscriptions by service provider",
          },
        });
      }
    }
  }
}

/**
 * Factory function to create Subscription controller
 */
export function createSubscriptionController(
  subscriptionService: ISubscriptionService
): SubscriptionController {
  return new SubscriptionController(subscriptionService);
}
