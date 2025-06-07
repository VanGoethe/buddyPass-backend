"use strict";
/**
 * Subscription Service Implementation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
exports.createSubscriptionService = createSubscriptionService;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const subscriptions_1 = require("../../models/subscriptions");
class SubscriptionService {
    constructor(subscriptionRepository, serviceProviderRepository, countryRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.serviceProviderRepository = serviceProviderRepository;
        this.countryRepository = countryRepository;
    }
    async createSubscription(data) {
        // Validate input data
        subscriptions_1.Subscription.validateCreateData(data);
        // Check if service provider exists
        const serviceProvider = await this.serviceProviderRepository.findById(data.serviceProviderId, true);
        if (!serviceProvider) {
            throw new Error("Service provider not found");
        }
        // Validate country if provided
        if (data.countryId) {
            await this.validateCountryForServiceProvider(data.countryId, data.serviceProviderId);
        }
        // Check if email already exists
        const emailExists = await this.subscriptionRepository.existsByEmail(data.email);
        if (emailExists) {
            throw new Error("A subscription with this email already exists");
        }
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(data.password, saltRounds);
        // Create subscription
        const subscription = await this.subscriptionRepository.create({
            ...data,
            passwordHash,
        });
        // Get with country included
        const subscriptionWithCountry = await this.subscriptionRepository.findById(subscription.id, true);
        return new subscriptions_1.Subscription(subscriptionWithCountry).toResponse();
    }
    async getSubscriptionById(id) {
        if (!id || id.trim().length === 0) {
            throw new Error("Subscription ID is required");
        }
        const subscription = await this.subscriptionRepository.findById(id, true);
        if (!subscription) {
            throw new Error("Subscription not found");
        }
        return new subscriptions_1.Subscription(subscription).toResponse();
    }
    async getSubscriptions(options = {}) {
        // Validate pagination parameters
        if (options.page !== undefined && options.page < 1) {
            throw new Error("Page number must be greater than 0");
        }
        if (options.limit && (options.limit < 1 || options.limit > 100)) {
            throw new Error("Limit must be between 1 and 100");
        }
        const { page = 1, limit = 10 } = options;
        const result = await this.subscriptionRepository.findMany(options);
        const subscriptions = result.subscriptions.map((sub) => new subscriptions_1.Subscription(sub).toResponse());
        const totalPages = Math.ceil(result.total / limit);
        return {
            subscriptions,
            total: result.total,
            page,
            limit,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
        };
    }
    async updateSubscription(id, data) {
        if (!id || id.trim().length === 0) {
            throw new Error("Subscription ID is required");
        }
        // Validate input data
        subscriptions_1.Subscription.validateUpdateData(data);
        // Check if subscription exists
        const existingSubscription = await this.subscriptionRepository.findById(id);
        if (!existingSubscription) {
            throw new Error("Subscription not found");
        }
        // Validate country if provided
        if (data.countryId !== undefined) {
            if (data.countryId) {
                await this.validateCountryForServiceProvider(data.countryId, existingSubscription.serviceProviderId);
            }
        }
        // Check if new email conflicts with existing subscription
        if (data.email) {
            const emailExists = await this.subscriptionRepository.existsByEmail(data.email, id);
            if (emailExists) {
                throw new Error("A subscription with this email already exists");
            }
        }
        // Prepare update data
        const updateData = { ...data };
        // Hash password if provided
        if (data.password) {
            const saltRounds = 12;
            updateData.passwordHash = await bcryptjs_1.default.hash(data.password, saltRounds);
            delete updateData.password;
        }
        // Update subscription
        const updatedSubscription = await this.subscriptionRepository.update(id, updateData);
        // Get with country included
        const subscriptionWithCountry = await this.subscriptionRepository.findById(id, true);
        return new subscriptions_1.Subscription(subscriptionWithCountry).toResponse();
    }
    async deleteSubscription(id) {
        if (!id || id.trim().length === 0) {
            throw new Error("Subscription ID is required");
        }
        // Check if subscription exists
        const existingSubscription = await this.subscriptionRepository.findById(id);
        if (!existingSubscription) {
            throw new Error("Subscription not found");
        }
        // Delete subscription
        await this.subscriptionRepository.delete(id);
    }
    async getSubscriptionsByServiceProvider(serviceProviderId) {
        if (!serviceProviderId || serviceProviderId.trim().length === 0) {
            throw new Error("Service provider ID is required");
        }
        // Check if service provider exists
        const serviceProvider = await this.serviceProviderRepository.findById(serviceProviderId);
        if (!serviceProvider) {
            throw new Error("Service provider not found");
        }
        const subscriptions = await this.subscriptionRepository.findByServiceProviderId(serviceProviderId);
        return subscriptions.map((sub) => new subscriptions_1.Subscription(sub).toResponse());
    }
    /**
     * Validates that the country is supported by the service provider
     */
    async validateCountryForServiceProvider(countryId, serviceProviderId) {
        const country = await this.countryRepository.findById(countryId);
        if (!country) {
            throw new Error("Country not found");
        }
        if (!country.isActive) {
            throw new Error(`Country ${country.name} is not active`);
        }
        const serviceProvider = await this.serviceProviderRepository.findById(serviceProviderId, true);
        if (!serviceProvider || !serviceProvider.supportedCountries) {
            throw new Error("Service provider not found or has no supported countries");
        }
        const supportedCountryIds = serviceProvider.supportedCountries.map((rel) => rel.country.id);
        if (!supportedCountryIds.includes(countryId)) {
            throw new Error(`Country ${country.name} is not supported by this service provider`);
        }
    }
}
exports.SubscriptionService = SubscriptionService;
/**
 * Factory function to create Subscription service
 */
function createSubscriptionService(subscriptionRepository, serviceProviderRepository, countryRepository) {
    return new SubscriptionService(subscriptionRepository, serviceProviderRepository, countryRepository);
}
//# sourceMappingURL=index.js.map