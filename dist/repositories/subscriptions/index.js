"use strict";
/**
 * Subscription Repository Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaSubscriptionRequestRepository = exports.PrismaSubscriptionSlotRepository = exports.PrismaSubscriptionRepository = void 0;
exports.createSubscriptionRepository = createSubscriptionRepository;
const subscriptions_1 = require("../../types/subscriptions");
const subscriptions_2 = require("../../models/subscriptions");
class PrismaSubscriptionRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const subscription = await this.prisma.subscription.create({
            data: {
                serviceProviderId: data.serviceProviderId,
                countryId: data.countryId,
                name: data.name,
                email: data.email,
                passwordHash: data.passwordHash,
                availableSlots: data.availableSlots,
                expiresAt: data.expiresAt,
                renewalInfo: data.renewalInfo,
                userPrice: data.userPrice,
                currencyId: data.currencyId,
                metadata: data.metadata,
                isActive: data.isActive ?? true,
            },
            include: {
                country: true,
            },
        });
        return subscriptions_2.Subscription.fromPrisma(subscription);
    }
    async findById(id, includeCountry = false) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { id },
            include: {
                country: includeCountry,
            },
        });
        return subscription ? subscriptions_2.Subscription.fromPrisma(subscription) : null;
    }
    async findMany(options = {}) {
        const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", search, serviceProviderId, isActive, countryId, } = options;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }
        if (serviceProviderId) {
            where.serviceProviderId = serviceProviderId;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        if (countryId) {
            where.countryId = countryId;
        }
        const [subscriptions, total] = await Promise.all([
            this.prisma.subscription.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    country: true,
                },
            }),
            this.prisma.subscription.count({ where }),
        ]);
        return {
            subscriptions: subscriptions.map((s) => subscriptions_2.Subscription.fromPrisma(s)),
            total,
        };
    }
    async update(id, data) {
        const subscription = await this.prisma.subscription.update({
            where: { id },
            data: {
                countryId: data.countryId,
                name: data.name,
                email: data.email,
                passwordHash: data.passwordHash,
                availableSlots: data.availableSlots,
                expiresAt: data.expiresAt,
                renewalInfo: data.renewalInfo,
                userPrice: data.userPrice,
                currencyId: data.currencyId,
                metadata: data.metadata,
                isActive: data.isActive,
            },
            include: {
                country: true,
            },
        });
        return subscriptions_2.Subscription.fromPrisma(subscription);
    }
    async delete(id) {
        await this.prisma.subscription.delete({
            where: { id },
        });
    }
    async existsByEmail(email, excludeId) {
        const where = { email };
        if (excludeId) {
            where.id = { not: excludeId };
        }
        const count = await this.prisma.subscription.count({ where });
        return count > 0;
    }
    async findByServiceProviderId(serviceProviderId) {
        const subscriptions = await this.prisma.subscription.findMany({
            where: { serviceProviderId },
            include: {
                country: true,
            },
        });
        return subscriptions.map((s) => subscriptions_2.Subscription.fromPrisma(s));
    }
    async countByServiceProviderId(serviceProviderId) {
        return this.prisma.subscription.count({
            where: { serviceProviderId },
        });
    }
    async findAvailableByServiceProviderId(serviceProviderId, countryId) {
        const where = {
            serviceProviderId,
            availableSlots: { gt: 0 },
            isActive: true,
        };
        if (countryId) {
            where.countryId = countryId;
        }
        const subscriptions = await this.prisma.subscription.findMany({
            where,
            orderBy: [
                { availableSlots: "desc" }, // Fill subscriptions with fewer available slots first
                { createdAt: "asc" }, // Then oldest first
            ],
            include: {
                country: true,
            },
        });
        return subscriptions.map((s) => subscriptions_2.Subscription.fromPrisma(s));
    }
    async decrementAvailableSlots(subscriptionId) {
        const subscription = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                availableSlots: { decrement: 1 },
            },
            include: {
                country: true,
            },
        });
        return subscriptions_2.Subscription.fromPrisma(subscription);
    }
}
exports.PrismaSubscriptionRepository = PrismaSubscriptionRepository;
class PrismaSubscriptionSlotRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const slot = await this.prisma.subscriptionSlot.create({
            data: {
                userId: data.userId,
                subscriptionId: data.subscriptionId,
            },
            include: {
                user: true,
                subscription: {
                    include: {
                        country: true,
                    },
                },
            },
        });
        return subscriptions_2.SubscriptionSlot.fromPrisma(slot);
    }
    async findByUserId(userId) {
        const slots = await this.prisma.subscriptionSlot.findMany({
            where: { userId, isActive: true },
            include: {
                user: true,
                subscription: {
                    include: {
                        country: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return slots.map((slot) => subscriptions_2.SubscriptionSlot.fromPrisma(slot));
    }
    async findBySubscriptionId(subscriptionId) {
        const slots = await this.prisma.subscriptionSlot.findMany({
            where: { subscriptionId, isActive: true },
            include: {
                user: true,
                subscription: {
                    include: {
                        country: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return slots.map((slot) => subscriptions_2.SubscriptionSlot.fromPrisma(slot));
    }
    async findByUserAndSubscription(userId, subscriptionId) {
        const slot = await this.prisma.subscriptionSlot.findFirst({
            where: { userId, subscriptionId, isActive: true },
            include: {
                user: true,
                subscription: {
                    include: {
                        country: true,
                    },
                },
            },
        });
        return slot ? subscriptions_2.SubscriptionSlot.fromPrisma(slot) : null;
    }
    async findByUserAndServiceProvider(userId, serviceProviderId) {
        const slot = await this.prisma.subscriptionSlot.findFirst({
            where: {
                userId,
                isActive: true,
                subscription: {
                    serviceProviderId,
                },
            },
            include: {
                user: true,
                subscription: {
                    include: {
                        country: true,
                    },
                },
            },
        });
        return slot ? subscriptions_2.SubscriptionSlot.fromPrisma(slot) : null;
    }
    async countBySubscriptionId(subscriptionId) {
        return this.prisma.subscriptionSlot.count({
            where: { subscriptionId, isActive: true },
        });
    }
    async delete(id) {
        await this.prisma.subscriptionSlot.delete({
            where: { id },
        });
    }
    async deleteByUserAndSubscription(userId, subscriptionId) {
        await this.prisma.subscriptionSlot.deleteMany({
            where: { userId, subscriptionId },
        });
    }
}
exports.PrismaSubscriptionSlotRepository = PrismaSubscriptionSlotRepository;
class PrismaSubscriptionRequestRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const request = await this.prisma.subscriptionRequest.create({
            data: {
                userId: data.userId,
                serviceProviderId: data.serviceProviderId,
                countryId: data.countryId,
            },
            include: {
                user: true,
                serviceProvider: true,
                country: true,
            },
        });
        return subscriptions_2.SubscriptionRequest.fromPrisma(request);
    }
    async findById(id) {
        const request = await this.prisma.subscriptionRequest.findUnique({
            where: { id },
            include: {
                user: true,
                serviceProvider: true,
                country: true,
            },
        });
        return request ? subscriptions_2.SubscriptionRequest.fromPrisma(request) : null;
    }
    async findByUserId(userId) {
        const requests = await this.prisma.subscriptionRequest.findMany({
            where: { userId },
            include: {
                user: true,
                serviceProvider: true,
                country: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return requests.map((request) => subscriptions_2.SubscriptionRequest.fromPrisma(request));
    }
    async findPendingRequests() {
        const requests = await this.prisma.subscriptionRequest.findMany({
            where: { status: subscriptions_1.SubscriptionRequestStatus.PENDING },
            include: {
                user: true,
                serviceProvider: true,
                country: true,
            },
            orderBy: { createdAt: "asc" }, // FIFO processing
        });
        return requests.map((request) => subscriptions_2.SubscriptionRequest.fromPrisma(request));
    }
    async findPendingByServiceProvider(serviceProviderId) {
        const requests = await this.prisma.subscriptionRequest.findMany({
            where: {
                serviceProviderId,
                status: subscriptions_1.SubscriptionRequestStatus.PENDING,
            },
            include: {
                user: true,
                serviceProvider: true,
                country: true,
            },
            orderBy: { createdAt: "asc" }, // FIFO processing
        });
        return requests.map((request) => subscriptions_2.SubscriptionRequest.fromPrisma(request));
    }
    async updateStatus(id, status) {
        const request = await this.prisma.subscriptionRequest.update({
            where: { id },
            data: { status, processedAt: new Date() },
            include: {
                user: true,
                serviceProvider: true,
                country: true,
            },
        });
        return subscriptions_2.SubscriptionRequest.fromPrisma(request);
    }
    async update(id, data) {
        const request = await this.prisma.subscriptionRequest.update({
            where: { id },
            data,
            include: {
                user: true,
                serviceProvider: true,
                country: true,
            },
        });
        return subscriptions_2.SubscriptionRequest.fromPrisma(request);
    }
    async delete(id) {
        await this.prisma.subscriptionRequest.delete({
            where: { id },
        });
    }
}
exports.PrismaSubscriptionRequestRepository = PrismaSubscriptionRequestRepository;
/**
 * Factory function to create Subscription repository
 */
function createSubscriptionRepository(prisma) {
    return new PrismaSubscriptionRepository(prisma);
}
//# sourceMappingURL=index.js.map