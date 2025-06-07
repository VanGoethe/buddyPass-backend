"use strict";
/**
 * Subscription Domain Model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
class Subscription {
    constructor(data) {
        this.id = data.id;
        this.serviceProviderId = data.serviceProviderId;
        this.countryId = data.countryId;
        this.name = data.name;
        this.email = data.email;
        this.passwordHash = data.passwordHash;
        this.availableSlots = data.availableSlots;
        this.expiresAt = data.expiresAt;
        this.renewalInfo = data.renewalInfo;
        this.userPrice = data.userPrice;
        this.currency = data.currency;
        this.metadata = data.metadata;
        this.isActive = data.isActive;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.country = data.country;
    }
    /**
     * Validates subscription creation data
     */
    static validateCreateData(data) {
        if (!data.serviceProviderId || data.serviceProviderId.trim().length === 0) {
            throw new Error("Service provider ID is required");
        }
        if (!data.name || data.name.trim().length === 0) {
            throw new Error("Subscription name is required");
        }
        if (data.name.trim().length > 100) {
            throw new Error("Subscription name must be 100 characters or less");
        }
        if (!data.email || data.email.trim().length === 0) {
            throw new Error("Email is required");
        }
        if (!this.isValidEmail(data.email)) {
            throw new Error("Invalid email format");
        }
        if (!data.password || data.password.length === 0) {
            throw new Error("Password is required");
        }
        if (data.password.length < 6) {
            throw new Error("Password must be at least 6 characters long");
        }
        if (!data.availableSlots || data.availableSlots < 1) {
            throw new Error("Available slots must be at least 1");
        }
        if (data.availableSlots > 100) {
            throw new Error("Available slots cannot exceed 100");
        }
        if (data.userPrice !== undefined && data.userPrice < 0) {
            throw new Error("User price cannot be negative");
        }
        if (data.currency && data.currency.length !== 3) {
            throw new Error("Currency must be a 3-letter code (e.g., USD, EUR)");
        }
        if (data.expiresAt && data.expiresAt <= new Date()) {
            throw new Error("Expiration date must be in the future");
        }
    }
    /**
     * Validates subscription update data
     */
    static validateUpdateData(data) {
        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                throw new Error("Subscription name is required");
            }
            if (data.name.trim().length > 100) {
                throw new Error("Subscription name must be 100 characters or less");
            }
        }
        if (data.email !== undefined) {
            if (!data.email || data.email.trim().length === 0) {
                throw new Error("Email is required");
            }
            if (!this.isValidEmail(data.email)) {
                throw new Error("Invalid email format");
            }
        }
        if (data.password !== undefined) {
            if (!data.password || data.password.length === 0) {
                throw new Error("Password is required");
            }
            if (data.password.length < 6) {
                throw new Error("Password must be at least 6 characters long");
            }
        }
        if (data.availableSlots !== undefined) {
            if (!data.availableSlots || data.availableSlots < 1) {
                throw new Error("Available slots must be at least 1");
            }
            if (data.availableSlots > 100) {
                throw new Error("Available slots cannot exceed 100");
            }
        }
        if (data.userPrice !== undefined && data.userPrice < 0) {
            throw new Error("User price cannot be negative");
        }
        if (data.currency !== undefined &&
            data.currency &&
            data.currency.length !== 3) {
            throw new Error("Currency must be a 3-letter code (e.g., USD, EUR)");
        }
        if (data.expiresAt !== undefined &&
            data.expiresAt &&
            data.expiresAt <= new Date()) {
            throw new Error("Expiration date must be in the future");
        }
    }
    /**
     * Validates email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Converts domain model to API response format
     */
    toResponse() {
        return {
            id: this.id,
            serviceProviderId: this.serviceProviderId,
            countryId: this.countryId,
            name: this.name,
            email: this.email,
            availableSlots: this.availableSlots,
            country: this.country
                ? {
                    id: this.country.id,
                    name: this.country.name,
                    code: this.country.code,
                    alpha3: this.country.alpha3,
                }
                : null,
            expiresAt: this.expiresAt?.toISOString() || null,
            renewalInfo: this.renewalInfo,
            userPrice: this.userPrice?.toString() || null,
            currency: this.currency,
            metadata: this.metadata,
            isActive: this.isActive,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
        };
    }
    /**
     * Creates a Subscription instance from Prisma result
     */
    static fromPrisma(data) {
        return new Subscription({
            id: data.id,
            serviceProviderId: data.serviceProviderId,
            countryId: data.countryId,
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            availableSlots: data.availableSlots,
            expiresAt: data.expiresAt,
            renewalInfo: data.renewalInfo,
            userPrice: data.userPrice,
            currency: data.currency,
            metadata: data.metadata,
            isActive: data.isActive,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            country: data.country || null,
        });
    }
}
exports.Subscription = Subscription;
//# sourceMappingURL=index.js.map