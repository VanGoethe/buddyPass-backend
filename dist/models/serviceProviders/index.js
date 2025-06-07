"use strict";
/**
 * ServiceProvider Domain Model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceProvider = void 0;
class ServiceProvider {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.metadata = data.metadata;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.supportedCountries = data.supportedCountries;
    }
    /**
     * Validates service provider creation data
     */
    static validateCreateData(data) {
        if (!data.name || data.name.trim().length === 0) {
            throw new Error("Service provider name is required");
        }
        if (data.name.trim().length > 100) {
            throw new Error("Service provider name must be 100 characters or less");
        }
        if (data.description && data.description.length > 500) {
            throw new Error("Service provider description must be 500 characters or less");
        }
        if (data.supportedCountryIds && data.supportedCountryIds.length > 50) {
            throw new Error("Cannot support more than 50 countries");
        }
    }
    /**
     * Validates service provider update data
     */
    static validateUpdateData(data) {
        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                throw new Error("Service provider name is required");
            }
            if (data.name.trim().length > 100) {
                throw new Error("Service provider name must be 100 characters or less");
            }
        }
        if (data.description !== undefined &&
            data.description &&
            data.description.length > 500) {
            throw new Error("Service provider description must be 500 characters or less");
        }
        if (data.supportedCountryIds && data.supportedCountryIds.length > 50) {
            throw new Error("Cannot support more than 50 countries");
        }
    }
    /**
     * Converts domain model to API response format
     */
    toResponse() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            metadata: this.metadata,
            supportedCountries: this.supportedCountries?.map((rel) => ({
                id: rel.country.id,
                name: rel.country.name,
                code: rel.country.code,
                alpha3: rel.country.alpha3,
            })) || [],
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
        };
    }
    /**
     * Creates a ServiceProvider instance from Prisma result
     */
    static fromPrisma(data) {
        return new ServiceProvider({
            id: data.id,
            name: data.name,
            description: data.description,
            metadata: data.metadata,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            supportedCountries: data.supportedCountries || [],
        });
    }
}
exports.ServiceProvider = ServiceProvider;
//# sourceMappingURL=index.js.map