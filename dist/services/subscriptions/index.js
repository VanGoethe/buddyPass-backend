"use strict";
/**
 * Subscription Service Implementation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotAssignmentService = exports.SubscriptionService = void 0;
exports.createSubscriptionService = createSubscriptionService;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const subscriptions_1 = require("../../types/subscriptions");
const subscriptions_2 = require("../../models/subscriptions");
class SubscriptionService {
    constructor(subscriptionRepository, subscriptionSlotRepository, subscriptionRequestRepository, serviceProviderRepository, countryRepository, slotAssignmentService) {
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionSlotRepository = subscriptionSlotRepository;
        this.subscriptionRequestRepository = subscriptionRequestRepository;
        this.serviceProviderRepository = serviceProviderRepository;
        this.countryRepository = countryRepository;
        this.slotAssignmentService = slotAssignmentService;
    }
    async createSubscription(data) {
        // Validate the data
        subscriptions_2.Subscription.validateCreateData(data);
        // Check if service provider exists
        const serviceProvider = await this.serviceProviderRepository.findById(data.serviceProviderId);
        if (!serviceProvider) {
            throw new Error("Service provider not found");
        }
        // Check if country exists and is supported by the service provider
        if (data.countryId) {
            const country = await this.countryRepository.findById(data.countryId);
            if (!country) {
                throw new Error("Country not found");
            }
            if (!country.isActive) {
                throw new Error("Country is not active");
            }
            // Check if service provider supports this country
            const supportedCountries = await this.serviceProviderRepository.getSupportedCountries(data.serviceProviderId);
            const isCountrySupported = supportedCountries.some((c) => c.id === data.countryId);
            if (!isCountrySupported) {
                throw new Error("Service provider does not support the specified country");
            }
        }
        // Check for duplicate email
        const existsWithEmail = await this.subscriptionRepository.existsByEmail(data.email);
        if (existsWithEmail) {
            throw new Error("A subscription with this email already exists");
        }
        // Hash the password
        const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
        // Create the subscription
        const subscription = await this.subscriptionRepository.create({
            ...data,
            passwordHash,
        });
        return new subscriptions_2.Subscription(subscription).toResponse();
    }
    async getSubscriptionById(id) {
        const subscription = await this.subscriptionRepository.findById(id, true);
        if (!subscription) {
            throw new Error("Subscription not found");
        }
        return new subscriptions_2.Subscription(subscription).toResponse();
    }
    async getSubscriptions(options) {
        const { subscriptions, total } = await this.subscriptionRepository.findMany(options);
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        return {
            subscriptions: subscriptions.map((sub) => new subscriptions_2.Subscription(sub).toResponse()),
            total,
            page,
            limit,
            hasNext: page * limit < total,
            hasPrevious: page > 1,
        };
    }
    async updateSubscription(id, data) {
        // Validate the update data
        subscriptions_2.Subscription.validateUpdateData(data);
        // Check if subscription exists
        const existingSubscription = await this.subscriptionRepository.findById(id);
        if (!existingSubscription) {
            throw new Error("Subscription not found");
        }
        // Check if country exists if provided
        if (data.countryId) {
            const country = await this.countryRepository.findById(data.countryId);
            if (!country) {
                throw new Error("Country not found");
            }
            if (!country.isActive) {
                throw new Error("Country is not active");
            }
            // Check if service provider supports this country
            const supportedCountries = await this.serviceProviderRepository.getSupportedCountries(existingSubscription.serviceProviderId);
            const isCountrySupported = supportedCountries.some((c) => c.id === data.countryId);
            if (!isCountrySupported) {
                throw new Error("Service provider does not support the specified country");
            }
        }
        // Check for duplicate email if email is being updated
        if (data.email) {
            const existsWithEmail = await this.subscriptionRepository.existsByEmail(data.email, id);
            if (existsWithEmail) {
                throw new Error("A subscription with this email already exists");
            }
        }
        // Hash password if provided
        let updateData = {
            ...data,
        };
        if (data.password) {
            updateData.passwordHash = await bcryptjs_1.default.hash(data.password, 10);
            delete updateData.password;
        }
        const subscription = await this.subscriptionRepository.update(id, updateData);
        return new subscriptions_2.Subscription(subscription).toResponse();
    }
    async deleteSubscription(id) {
        const subscription = await this.subscriptionRepository.findById(id);
        if (!subscription) {
            throw new Error("Subscription not found");
        }
        await this.subscriptionRepository.delete(id);
    }
    async getSubscriptionsByServiceProvider(serviceProviderId) {
        const subscriptions = await this.subscriptionRepository.findByServiceProviderId(serviceProviderId);
        return subscriptions.map((sub) => new subscriptions_2.Subscription(sub).toResponse());
    }
    async requestSubscriptionSlot(userId, data) {
        // Validate request data
        subscriptions_2.SubscriptionRequest.validateRequestData({
            userId,
            serviceProviderId: data.serviceProviderId,
            countryId: data.countryId,
        });
        // Check if service provider exists
        const serviceProvider = await this.serviceProviderRepository.findById(data.serviceProviderId);
        if (!serviceProvider) {
            throw new Error("Service provider not found");
        }
        // Check if country exists if provided
        if (data.countryId) {
            const country = await this.countryRepository.findById(data.countryId);
            if (!country) {
                throw new Error("Country not found");
            }
            if (!country.isActive) {
                throw new Error("Country is not active");
            }
            // Check if service provider supports this country
            const supportedCountries = await this.serviceProviderRepository.getSupportedCountries(data.serviceProviderId);
            const isCountrySupported = supportedCountries.some((c) => c.id === data.countryId);
            if (!isCountrySupported) {
                throw new Error("Service provider does not support the specified country");
            }
        }
        // Check if user already has a pending request for this service provider
        const existingRequests = await this.subscriptionRequestRepository.findByUserId(userId);
        const hasPendingRequest = existingRequests.some((req) => req.serviceProviderId === data.serviceProviderId &&
            req.status === subscriptions_1.SubscriptionRequestStatus.PENDING &&
            req.countryId === data.countryId);
        if (hasPendingRequest) {
            throw new Error("You already have a pending request for this service provider and country");
        }
        // Try to assign slot immediately
        const assignmentResult = await this.slotAssignmentService.assignSlotToUser(userId, data.serviceProviderId, data.countryId);
        // Create the request with appropriate status
        const request = await this.subscriptionRequestRepository.create({
            userId,
            serviceProviderId: data.serviceProviderId,
            countryId: data.countryId,
        });
        if (assignmentResult.success && assignmentResult.slotAssignment) {
            // Update request status to ASSIGNED
            await this.subscriptionRequestRepository.update(request.id, {
                status: subscriptions_1.SubscriptionRequestStatus.ASSIGNED,
                assignedSlotId: assignmentResult.slotAssignment.id,
                processedAt: new Date(),
            });
            const updatedRequest = await this.subscriptionRequestRepository.findById(request.id);
            if (updatedRequest) {
                return new subscriptions_2.SubscriptionRequest(updatedRequest).toResponse();
            }
        }
        // Return pending request
        return new subscriptions_2.SubscriptionRequest(request).toResponse();
    }
    async getUserSubscriptionSlots(userId) {
        const slots = await this.subscriptionSlotRepository.findByUserId(userId);
        return slots.map((slot) => new subscriptions_2.SubscriptionSlot(slot).toResponse());
    }
}
exports.SubscriptionService = SubscriptionService;
class SlotAssignmentService {
    constructor(subscriptionRepository, subscriptionSlotRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionSlotRepository = subscriptionSlotRepository;
    }
    async assignSlotToUser(userId, serviceProviderId, countryId) {
        try {
            // Check if user already has a slot for this service provider/country combination
            const availableSubscriptions = await this.subscriptionRepository.findAvailableByServiceProviderId(serviceProviderId, countryId);
            // Check if user already has a slot in any of these subscriptions
            for (const subscription of availableSubscriptions) {
                const existingSlot = await this.subscriptionSlotRepository.findByUserAndSubscription(userId, subscription.id);
                if (existingSlot) {
                    return {
                        success: false,
                        message: "You already have a slot assigned for this service provider",
                    };
                }
            }
            // Find the best available subscription to fill
            const targetSubscription = await this.findAvailableSlot(serviceProviderId, countryId);
            if (!targetSubscription) {
                return {
                    success: false,
                    message: "No available slots found. All subscriptions are currently full, but new subscriptions will be created shortly. Please try again later.",
                };
            }
            // Validate that the subscription still has available slots
            const isValidAssignment = await this.validateSlotAssignment(targetSubscription.id);
            if (!isValidAssignment) {
                return {
                    success: false,
                    message: "Selected subscription is no longer available. Please try again.",
                };
            }
            // Create the slot assignment and decrement available slots atomically
            const slotAssignment = await this.subscriptionSlotRepository.create({
                userId,
                subscriptionId: targetSubscription.id,
            });
            // Decrement available slots
            await this.subscriptionRepository.decrementAvailableSlots(targetSubscription.id);
            return {
                success: true,
                slotAssignment,
                message: "Slot successfully assigned",
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to assign slot: ${error.message}`,
            };
        }
    }
    async findAvailableSlot(serviceProviderId, countryId) {
        const availableSubscriptions = await this.subscriptionRepository.findAvailableByServiceProviderId(serviceProviderId, countryId);
        // Filter out inactive or expired subscriptions
        const validSubscriptions = availableSubscriptions.filter((sub) => {
            const subscription = new subscriptions_2.Subscription(sub);
            return (subscription.isActiveAndValid() && subscription.hasAvailableSlots());
        });
        if (validSubscriptions.length === 0) {
            return null;
        }
        // Return the subscription with the fewest available slots (to fill them up one by one)
        // The repository already orders by availableSlots DESC, so we want the last one (fewest slots)
        return validSubscriptions[validSubscriptions.length - 1];
    }
    async validateSlotAssignment(subscriptionId) {
        const subscription = await this.subscriptionRepository.findById(subscriptionId);
        if (!subscription) {
            return false;
        }
        const domainSubscription = new subscriptions_2.Subscription(subscription);
        if (!domainSubscription.isActiveAndValid() ||
            !domainSubscription.hasAvailableSlots()) {
            return false;
        }
        // Double-check that occupied slots don't exceed available slots
        const occupiedSlots = await this.subscriptionSlotRepository.countBySubscriptionId(subscriptionId);
        const totalSlots = occupiedSlots + subscription.availableSlots;
        return occupiedSlots < totalSlots;
    }
}
exports.SlotAssignmentService = SlotAssignmentService;
/**
 * Factory function to create Subscription service
 */
function createSubscriptionService(subscriptionRepository, subscriptionSlotRepository, subscriptionRequestRepository, serviceProviderRepository, countryRepository, slotAssignmentService) {
    return new SubscriptionService(subscriptionRepository, subscriptionSlotRepository, subscriptionRequestRepository, serviceProviderRepository, countryRepository, slotAssignmentService);
}
//# sourceMappingURL=index.js.map