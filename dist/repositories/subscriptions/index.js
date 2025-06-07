"use strict";
/**
 * Subscription Repository Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaSubscriptionRepository = void 0;
exports.createSubscriptionRepository = createSubscriptionRepository;
const client_1 = require("@prisma/client");
const subscriptions_1 = require("../../models/subscriptions");
class PrismaSubscriptionRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const subscription = await this.prisma.subscription.create({
                data: {
                    serviceProviderId: data.serviceProviderId,
                    countryId: data.countryId || null,
                    name: data.name.trim(),
                    email: data.email.trim().toLowerCase(),
                    passwordHash: data.passwordHash,
                    availableSlots: data.availableSlots,
                    expiresAt: data.expiresAt || null,
                    renewalInfo: data.renewalInfo || null,
                    userPrice: data.userPrice ? new client_1.Prisma.Decimal(data.userPrice) : null,
                    currency: data.currency?.toUpperCase() || null,
                    metadata: data.metadata || null,
                    isActive: data.isActive !== undefined ? data.isActive : true,
                },
            });
            return subscriptions_1.Subscription.fromPrisma(subscription);
        }
        catch (error) {
            if (error.code === "P2002") {
                throw new Error("A subscription with this email already exists");
            }
            if (error.code === "P2003") {
                throw new Error("Service provider or country not found");
            }
            throw new Error(`Failed to create subscription: ${error.message}`);
        }
    }
    async findById(id, includeCountry = false) {
        try {
            const include = {};
            if (includeCountry) {
                include.country = true;
            }
            const subscription = await this.prisma.subscription.findUnique({
                where: { id },
                include,
            });
            return subscription ? subscriptions_1.Subscription.fromPrisma(subscription) : null;
        }
        catch (error) {
            throw new Error(`Failed to find subscription: ${error.message}`);
        }
    }
    async findMany(options = {}) {
        try {
            const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", search, serviceProviderId, isActive, countryId, } = options;
            const skip = (page - 1) * limit;
            const take = Math.min(limit, 100); // Cap at 100 items per page
            // Build where clause
            const where = {};
            if (search) {
                where.OR = [
                    {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        email: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
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
            // Build orderBy clause
            const orderBy = {};
            orderBy[sortBy] = sortOrder;
            const [subscriptions, total] = await Promise.all([
                this.prisma.subscription.findMany({
                    where,
                    skip,
                    take,
                    orderBy,
                    include: {
                        country: true,
                    },
                }),
                this.prisma.subscription.count({ where }),
            ]);
            return {
                subscriptions: subscriptions.map((sub) => subscriptions_1.Subscription.fromPrisma(sub)),
                total,
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch subscriptions: ${error.message}`);
        }
    }
    async update(id, data) {
        try {
            const updateData = {};
            if (data.name !== undefined) {
                updateData.name = data.name.trim();
            }
            if (data.email !== undefined) {
                updateData.email = data.email.trim().toLowerCase();
            }
            if (data.passwordHash !== undefined) {
                updateData.passwordHash = data.passwordHash;
            }
            if (data.availableSlots !== undefined) {
                updateData.availableSlots = data.availableSlots;
            }
            if (data.countryId !== undefined) {
                updateData.countryId = data.countryId || null;
            }
            if (data.expiresAt !== undefined) {
                updateData.expiresAt = data.expiresAt || null;
            }
            if (data.renewalInfo !== undefined) {
                updateData.renewalInfo = data.renewalInfo || null;
            }
            if (data.userPrice !== undefined) {
                updateData.userPrice = data.userPrice
                    ? new client_1.Prisma.Decimal(data.userPrice)
                    : null;
            }
            if (data.currency !== undefined) {
                updateData.currency = data.currency?.toUpperCase() || null;
            }
            if (data.metadata !== undefined) {
                updateData.metadata = data.metadata || null;
            }
            if (data.isActive !== undefined) {
                updateData.isActive = data.isActive;
            }
            const subscription = await this.prisma.subscription.update({
                where: { id },
                data: updateData,
            });
            return subscriptions_1.Subscription.fromPrisma(subscription);
        }
        catch (error) {
            if (error.code === "P2025") {
                throw new Error("Subscription not found");
            }
            if (error.code === "P2002") {
                throw new Error("A subscription with this email already exists");
            }
            if (error.code === "P2003") {
                throw new Error("Country not found");
            }
            throw new Error(`Failed to update subscription: ${error.message}`);
        }
    }
    async delete(id) {
        try {
            await this.prisma.subscription.delete({
                where: { id },
            });
        }
        catch (error) {
            if (error.code === "P2025") {
                throw new Error("Subscription not found");
            }
            throw new Error(`Failed to delete subscription: ${error.message}`);
        }
    }
    async existsByEmail(email, excludeId) {
        try {
            const where = {
                email: {
                    equals: email.trim().toLowerCase(),
                    mode: "insensitive",
                },
            };
            if (excludeId) {
                where.id = {
                    not: excludeId,
                };
            }
            const count = await this.prisma.subscription.count({ where });
            return count > 0;
        }
        catch (error) {
            throw new Error(`Failed to check subscription email: ${error.message}`);
        }
    }
    async findByServiceProviderId(serviceProviderId) {
        try {
            const subscriptions = await this.prisma.subscription.findMany({
                where: { serviceProviderId },
                orderBy: { createdAt: "desc" },
            });
            return subscriptions.map((sub) => subscriptions_1.Subscription.fromPrisma(sub));
        }
        catch (error) {
            throw new Error(`Failed to find subscriptions by service provider: ${error.message}`);
        }
    }
    async countByServiceProviderId(serviceProviderId) {
        try {
            return await this.prisma.subscription.count({
                where: { serviceProviderId },
            });
        }
        catch (error) {
            throw new Error(`Failed to count subscriptions by service provider: ${error.message}`);
        }
    }
}
exports.PrismaSubscriptionRepository = PrismaSubscriptionRepository;
/**
 * Factory function to create Subscription repository
 */
function createSubscriptionRepository(prisma) {
    return new PrismaSubscriptionRepository(prisma);
}
//# sourceMappingURL=index.js.map