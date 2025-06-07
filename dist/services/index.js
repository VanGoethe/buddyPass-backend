"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceProviderService = exports.SubscriptionService = exports.UserService = exports.BaseService = void 0;
const database_1 = require("../config/database");
/**
 * Base service class with common functionality
 */
class BaseService {
    constructor() {
        this.prisma = (0, database_1.getPrismaClient)();
    }
    /**
     * Handle service errors consistently
     */
    handleError(error, operation) {
        console.error(`Service error in ${operation}:`, error);
        throw new Error(`Failed to ${operation}: ${error.message}`);
    }
    /**
     * Validate required fields
     */
    validateRequiredFields(data, requiredFields) {
        const missingFields = requiredFields.filter((field) => !data[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
        }
    }
}
exports.BaseService = BaseService;
/**
 * Service exports
 * Centralized exports for all service layers
 */
// User services
var users_1 = require("./users");
Object.defineProperty(exports, "UserService", { enumerable: true, get: function () { return users_1.UserService; } });
// Subscription services
var subscriptions_1 = require("./subscriptions");
Object.defineProperty(exports, "SubscriptionService", { enumerable: true, get: function () { return subscriptions_1.SubscriptionService; } });
// Service Provider services
var serviceProviders_1 = require("./serviceProviders");
Object.defineProperty(exports, "ServiceProviderService", { enumerable: true, get: function () { return serviceProviders_1.ServiceProviderService; } });
//# sourceMappingURL=index.js.map