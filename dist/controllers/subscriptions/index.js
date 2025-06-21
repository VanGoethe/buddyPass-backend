"use strict";
/**
 * Subscription Controller Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
exports.createSubscriptionController = createSubscriptionController;
const express_validator_1 = require("express-validator");
class SubscriptionController {
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
    }
    /**
     * Create a new subscription
     */
    async createSubscription(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
            const { serviceProviderId, name, email, password, availableSlots, countryId, expiresAt, renewalInfo, userPrice, currency, metadata, isActive, } = req.body;
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
                currencyId: currency,
                metadata,
                isActive,
            });
            res.status(201).json({
                success: true,
                data: subscription,
                message: "Subscription created successfully",
            });
        }
        catch (error) {
            if (error.message.includes("already exists")) {
                res.status(409).json({
                    success: false,
                    error: {
                        code: "CONFLICT",
                        message: error.message,
                    },
                });
            }
            else if (error.message === "Service provider not found") {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: error.message,
                    },
                });
            }
            else {
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
    async getSubscriptionById(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
            const subscription = await this.subscriptionService.getSubscriptionById(id);
            res.status(200).json({
                success: true,
                data: subscription,
            });
        }
        catch (error) {
            if (error.message === "Subscription not found") {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: error.message,
                    },
                });
            }
            else {
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
    async getSubscriptions(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
            const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", search, serviceProviderId, isActive, countryId, } = req.query;
            const result = await this.subscriptionService.getSubscriptions({
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 10,
                sortBy: sortBy,
                sortOrder: sortOrder,
                search: search,
                serviceProviderId: serviceProviderId,
                isActive: isActive ? isActive === "true" : undefined,
                countryId: countryId,
            });
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
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
    async updateSubscription(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
            const { name, email, password, availableSlots, countryId, expiresAt, renewalInfo, userPrice, currency, metadata, isActive, } = req.body;
            const subscription = await this.subscriptionService.updateSubscription(id, {
                name,
                email,
                password,
                availableSlots,
                countryId,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                renewalInfo,
                userPrice,
                currencyId: currency,
                metadata,
                isActive,
            });
            res.status(200).json({
                success: true,
                data: subscription,
                message: "Subscription updated successfully",
            });
        }
        catch (error) {
            if (error.message === "Subscription not found") {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: error.message,
                    },
                });
            }
            else if (error.message.includes("already exists")) {
                res.status(409).json({
                    success: false,
                    error: {
                        code: "CONFLICT",
                        message: error.message,
                    },
                });
            }
            else {
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
    async deleteSubscription(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
        }
        catch (error) {
            if (error.message === "Subscription not found") {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: error.message,
                    },
                });
            }
            else {
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
    async getSubscriptionsByServiceProvider(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
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
            const subscriptions = await this.subscriptionService.getSubscriptionsByServiceProvider(serviceProviderId);
            res.status(200).json({
                success: true,
                data: subscriptions,
            });
        }
        catch (error) {
            if (error.message === "Service provider not found") {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: error.message,
                    },
                });
            }
            else {
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
    /**
     * Request a subscription slot
     */
    async requestSubscriptionSlot(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request data",
                        details: errors.array(),
                    },
                });
                return;
            }
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: "UNAUTHORIZED",
                        message: "User authentication required",
                    },
                });
                return;
            }
            const { serviceProviderId, countryId } = req.body;
            const request = await this.subscriptionService.requestSubscriptionSlot(userId, { serviceProviderId, countryId });
            const statusCode = request.status === "ASSIGNED" ? 200 : 200;
            const message = request.status === "ASSIGNED"
                ? "Slot successfully assigned! You now have access to this subscription."
                : "All subscription slots are currently full, but new subscriptions will be created shortly. Please check back in a few minutes.";
            res.status(statusCode).json({
                success: true,
                data: {
                    request,
                },
                message,
            });
        }
        catch (error) {
            console.error("Error requesting subscription slot:", error);
            if (error.message.includes("not found")) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: error.message,
                    },
                });
                return;
            }
            if (error.message.includes("already have") ||
                error.message.includes("pending request")) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "DUPLICATE_REQUEST",
                        message: error.message,
                    },
                });
                return;
            }
            if (error.message.includes("not support")) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "NOT_SUPPORTED",
                        message: error.message,
                    },
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Failed to request subscription slot",
                },
            });
        }
    }
    /**
     * Get user's subscription slots
     */
    async getUserSubscriptionSlots(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: "UNAUTHORIZED",
                        message: "User authentication required",
                    },
                });
                return;
            }
            const slots = await this.subscriptionService.getUserSubscriptionSlots(userId);
            res.status(200).json({
                success: true,
                data: {
                    slots,
                },
                message: "User subscription slots retrieved successfully",
            });
        }
        catch (error) {
            console.error("Error fetching user subscription slots:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "Failed to fetch user subscription slots",
                },
            });
        }
    }
}
exports.SubscriptionController = SubscriptionController;
/**
 * Validation rules for creating a subscription
 */
SubscriptionController.createValidation = [
    (0, express_validator_1.body)("serviceProviderId")
        .notEmpty()
        .withMessage("Service provider ID is required"),
    (0, express_validator_1.body)("name")
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ max: 100 })
        .withMessage("Name must be 100 characters or less")
        .trim(),
    (0, express_validator_1.body)("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
    (0, express_validator_1.body)("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    (0, express_validator_1.body)("availableSlots")
        .isInt({ min: 1, max: 100 })
        .withMessage("Available slots must be between 1 and 100"),
    (0, express_validator_1.body)("countryId")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Country must be 50 characters or less")
        .trim(),
    (0, express_validator_1.body)("expiresAt")
        .optional()
        .isISO8601()
        .withMessage("Expires at must be a valid date")
        .custom((value) => {
        if (value && new Date(value) <= new Date()) {
            throw new Error("Expiration date must be in the future");
        }
        return true;
    }),
    (0, express_validator_1.body)("renewalInfo")
        .optional()
        .custom((value) => {
        if (value && typeof value !== "object") {
            throw new Error("Renewal info must be a valid JSON object");
        }
        return true;
    }),
    (0, express_validator_1.body)("userPrice")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("User price must be a positive number"),
    (0, express_validator_1.body)("currency")
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code"),
    (0, express_validator_1.body)("metadata")
        .optional()
        .custom((value) => {
        if (value && typeof value !== "object") {
            throw new Error("Metadata must be a valid JSON object");
        }
        return true;
    }),
    (0, express_validator_1.body)("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
];
/**
 * Validation rules for updating a subscription
 */
SubscriptionController.updateValidation = [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Subscription ID is required"),
    (0, express_validator_1.body)("name")
        .optional()
        .notEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ max: 100 })
        .withMessage("Name must be 100 characters or less")
        .trim(),
    (0, express_validator_1.body)("email")
        .optional()
        .notEmpty()
        .withMessage("Email cannot be empty")
        .isEmail()
        .withMessage("Invalid email format")
        .normalizeEmail(),
    (0, express_validator_1.body)("password")
        .optional()
        .notEmpty()
        .withMessage("Password cannot be empty")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    (0, express_validator_1.body)("availableSlots")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Available slots must be between 1 and 100"),
    (0, express_validator_1.body)("countryId")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Country must be 50 characters or less")
        .trim(),
    (0, express_validator_1.body)("expiresAt")
        .optional()
        .isISO8601()
        .withMessage("Expires at must be a valid date")
        .custom((value) => {
        if (value && new Date(value) <= new Date()) {
            throw new Error("Expiration date must be in the future");
        }
        return true;
    }),
    (0, express_validator_1.body)("renewalInfo")
        .optional()
        .custom((value) => {
        if (value && typeof value !== "object") {
            throw new Error("Renewal info must be a valid JSON object");
        }
        return true;
    }),
    (0, express_validator_1.body)("userPrice")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("User price must be a positive number"),
    (0, express_validator_1.body)("currency")
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code"),
    (0, express_validator_1.body)("metadata")
        .optional()
        .custom((value) => {
        if (value && typeof value !== "object") {
            throw new Error("Metadata must be a valid JSON object");
        }
        return true;
    }),
    (0, express_validator_1.body)("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
];
/**
 * Validation rules for getting subscriptions
 */
SubscriptionController.getListValidation = [
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    (0, express_validator_1.query)("sortBy")
        .optional()
        .isIn([
        "name",
        "email",
        "availableSlots",
        "expiresAt",
        "createdAt",
        "updatedAt",
    ])
        .withMessage("sortBy must be one of: name, email, availableSlots, expiresAt, createdAt, updatedAt"),
    (0, express_validator_1.query)("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be either asc or desc"),
    (0, express_validator_1.query)("search")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Search term must be 100 characters or less")
        .trim(),
    (0, express_validator_1.query)("serviceProviderId")
        .optional()
        .notEmpty()
        .withMessage("Service provider ID cannot be empty"),
    (0, express_validator_1.query)("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean"),
    (0, express_validator_1.query)("countryId")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Country must be 50 characters or less"),
];
/**
 * Validation rules for getting a single subscription
 */
SubscriptionController.getByIdValidation = [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Subscription ID is required"),
];
/**
 * Validation rules for deleting a subscription
 */
SubscriptionController.deleteValidation = [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Subscription ID is required"),
];
/**
 * Validation rules for getting subscriptions by service provider
 */
SubscriptionController.getByServiceProviderValidation = [
    (0, express_validator_1.param)("serviceProviderId")
        .notEmpty()
        .withMessage("Service provider ID is required"),
];
/**
 * Factory function to create Subscription controller
 */
function createSubscriptionController(subscriptionService) {
    return new SubscriptionController(subscriptionService);
}
//# sourceMappingURL=index.js.map