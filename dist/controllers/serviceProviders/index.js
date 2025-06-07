"use strict";
/**
 * ServiceProvider Controller Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceProviderController = void 0;
exports.createServiceProviderController = createServiceProviderController;
const express_validator_1 = require("express-validator");
class ServiceProviderController {
    constructor(serviceProviderService) {
        this.serviceProviderService = serviceProviderService;
    }
    /**
     * Create a new service provider
     */
    async createServiceProvider(req, res) {
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
            const { name, description, metadata } = req.body;
            const serviceProvider = await this.serviceProviderService.createServiceProvider({
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
        }
        catch (error) {
            console.error("Service provider creation error:", error);
            if (error.message.includes("already exists")) {
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
                        message: "Failed to create service provider",
                        details: process.env.NODE_ENV === "development"
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
    async getServiceProviderById(req, res) {
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
            const serviceProvider = await this.serviceProviderService.getServiceProviderById(id);
            res.status(200).json({
                success: true,
                data: {
                    serviceProvider,
                },
            });
        }
        catch (error) {
            console.error("Service provider retrieval error:", error);
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
                        message: "Failed to get service provider",
                        details: process.env.NODE_ENV === "development"
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
    async getServiceProviders(req, res) {
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
            const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", search, } = req.query;
            const result = await this.serviceProviderService.getServiceProviders({
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 10,
                sortBy: sortBy,
                sortOrder: sortOrder,
                search: search,
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
                    message: "Failed to get service providers",
                },
            });
        }
    }
    /**
     * Update a service provider
     */
    async updateServiceProvider(req, res) {
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
            const { name, description, metadata } = req.body;
            const serviceProvider = await this.serviceProviderService.updateServiceProvider(id, {
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
        }
        catch (error) {
            console.error("Service provider update error:", error);
            if (error.message === "Service provider not found") {
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
                        message: "Failed to update service provider",
                        details: process.env.NODE_ENV === "development"
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
    async deleteServiceProvider(req, res) {
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
            await this.serviceProviderService.deleteServiceProvider(id);
            res.status(200).json({
                success: true,
                message: "Service provider deleted successfully",
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
            else if (error.message.includes("associated subscriptions")) {
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
                        message: "Failed to delete service provider",
                    },
                });
            }
        }
    }
}
exports.ServiceProviderController = ServiceProviderController;
/**
 * Validation rules for creating a service provider
 */
ServiceProviderController.createValidation = [
    (0, express_validator_1.body)("name")
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ max: 100 })
        .withMessage("Name must be 100 characters or less")
        .trim(),
    (0, express_validator_1.body)("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must be 500 characters or less")
        .trim(),
    (0, express_validator_1.body)("metadata")
        .optional()
        .custom((value) => {
        if (value && typeof value !== "object") {
            throw new Error("Metadata must be a valid JSON object");
        }
        if (value) {
            try {
                JSON.stringify(value);
            }
            catch (err) {
                throw new Error("Metadata contains invalid JSON values");
            }
        }
        return true;
    }),
];
/**
 * Validation rules for updating a service provider
 */
ServiceProviderController.updateValidation = [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Service provider ID is required"),
    (0, express_validator_1.body)("name")
        .optional()
        .notEmpty()
        .withMessage("Name cannot be empty")
        .isLength({ max: 100 })
        .withMessage("Name must be 100 characters or less")
        .trim(),
    (0, express_validator_1.body)("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must be 500 characters or less")
        .trim(),
    (0, express_validator_1.body)("metadata")
        .optional()
        .custom((value) => {
        if (value && typeof value !== "object") {
            throw new Error("Metadata must be a valid JSON object");
        }
        if (value) {
            try {
                JSON.stringify(value);
            }
            catch (err) {
                throw new Error("Metadata contains invalid JSON values");
            }
        }
        return true;
    }),
];
/**
 * Validation rules for getting service providers
 */
ServiceProviderController.getListValidation = [
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
        .isIn(["name", "createdAt", "updatedAt"])
        .withMessage("sortBy must be one of: name, createdAt, updatedAt"),
    (0, express_validator_1.query)("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortOrder must be either asc or desc"),
    (0, express_validator_1.query)("search")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Search term must be 100 characters or less")
        .trim(),
];
/**
 * Validation rules for getting a single service provider
 */
ServiceProviderController.getByIdValidation = [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Service provider ID is required"),
];
/**
 * Validation rules for deleting a service provider
 */
ServiceProviderController.deleteValidation = [
    (0, express_validator_1.param)("id").notEmpty().withMessage("Service provider ID is required"),
];
/**
 * Factory function to create ServiceProvider controller
 */
function createServiceProviderController(serviceProviderService) {
    return new ServiceProviderController(serviceProviderService);
}
//# sourceMappingURL=index.js.map