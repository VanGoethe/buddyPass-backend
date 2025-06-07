"use strict";
/**
 * Country Domain Model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Country = void 0;
class Country {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.code = data.code;
        this.alpha3 = data.alpha3;
        this.numericCode = data.numericCode;
        this.continent = data.continent;
        this.region = data.region;
        this.currency = data.currency;
        this.phoneCode = data.phoneCode;
        this.isActive = data.isActive;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
    /**
     * Validates country creation data
     */
    static validateCreateData(data) {
        // Validate required fields
        if (!data.name || data.name.trim().length === 0) {
            throw new Error("Country name is required");
        }
        if (!data.code || data.code.trim().length === 0) {
            throw new Error("Country ISO code is required");
        }
        if (!data.alpha3 || data.alpha3.trim().length === 0) {
            throw new Error("Country alpha-3 code is required");
        }
        // Validate field lengths
        if (data.name.trim().length > 100) {
            throw new Error("Country name must be 100 characters or less");
        }
        // Validate ISO codes format
        const codeRegex = /^[A-Z]{2}$/;
        if (!codeRegex.test(data.code.trim().toUpperCase())) {
            throw new Error("Country code must be a valid 2-letter ISO 3166-1 alpha-2 code");
        }
        const alpha3Regex = /^[A-Z]{3}$/;
        if (!alpha3Regex.test(data.alpha3.trim().toUpperCase())) {
            throw new Error("Country alpha-3 code must be a valid 3-letter ISO 3166-1 alpha-3 code");
        }
        // Validate numeric code if provided
        if (data.numericCode) {
            const numericRegex = /^\d{3}$/;
            if (!numericRegex.test(data.numericCode.trim())) {
                throw new Error("Country numeric code must be a valid 3-digit ISO 3166-1 numeric code");
            }
        }
        // Validate phone code if provided
        if (data.phoneCode) {
            const phoneCodeRegex = /^\+\d{1,4}$/;
            if (!phoneCodeRegex.test(data.phoneCode.trim())) {
                throw new Error("Phone code must be in format +X or +XXX or +XXXX");
            }
        }
        // Validate currency code if provided
        if (data.currency) {
            const currencyRegex = /^[A-Z]{3}$/;
            if (!currencyRegex.test(data.currency.trim().toUpperCase())) {
                throw new Error("Currency code must be a valid 3-letter ISO 4217 code");
            }
        }
    }
    /**
     * Validates country update data
     */
    static validateUpdateData(data) {
        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                throw new Error("Country name is required");
            }
            if (data.name.trim().length > 100) {
                throw new Error("Country name must be 100 characters or less");
            }
        }
        if (data.code !== undefined) {
            if (!data.code || data.code.trim().length === 0) {
                throw new Error("Country ISO code is required");
            }
            const codeRegex = /^[A-Z]{2}$/;
            if (!codeRegex.test(data.code.trim().toUpperCase())) {
                throw new Error("Country code must be a valid 2-letter ISO 3166-1 alpha-2 code");
            }
        }
        if (data.alpha3 !== undefined) {
            if (!data.alpha3 || data.alpha3.trim().length === 0) {
                throw new Error("Country alpha-3 code is required");
            }
            const alpha3Regex = /^[A-Z]{3}$/;
            if (!alpha3Regex.test(data.alpha3.trim().toUpperCase())) {
                throw new Error("Country alpha-3 code must be a valid 3-letter ISO 3166-1 alpha-3 code");
            }
        }
        if (data.numericCode !== undefined && data.numericCode) {
            const numericRegex = /^\d{3}$/;
            if (!numericRegex.test(data.numericCode.trim())) {
                throw new Error("Country numeric code must be a valid 3-digit ISO 3166-1 numeric code");
            }
        }
        if (data.phoneCode !== undefined && data.phoneCode) {
            const phoneCodeRegex = /^\+\d{1,4}$/;
            if (!phoneCodeRegex.test(data.phoneCode.trim())) {
                throw new Error("Phone code must be in format +X or +XXX or +XXXX");
            }
        }
        if (data.currency !== undefined && data.currency) {
            const currencyRegex = /^[A-Z]{3}$/;
            if (!currencyRegex.test(data.currency.trim().toUpperCase())) {
                throw new Error("Currency code must be a valid 3-letter ISO 4217 code");
            }
        }
    }
    /**
     * Normalizes country data for storage
     */
    static normalizeData(data) {
        const normalized = {};
        if (data.name !== undefined) {
            normalized.name = data.name.trim();
        }
        if (data.code !== undefined) {
            normalized.code = data.code.trim().toUpperCase();
        }
        if (data.alpha3 !== undefined) {
            normalized.alpha3 = data.alpha3.trim().toUpperCase();
        }
        if (data.numericCode !== undefined) {
            normalized.numericCode = data.numericCode
                ? data.numericCode.trim()
                : null;
        }
        if (data.continent !== undefined) {
            normalized.continent = data.continent ? data.continent.trim() : null;
        }
        if (data.region !== undefined) {
            normalized.region = data.region ? data.region.trim() : null;
        }
        if (data.currency !== undefined) {
            normalized.currency = data.currency
                ? data.currency.trim().toUpperCase()
                : null;
        }
        if (data.phoneCode !== undefined) {
            normalized.phoneCode = data.phoneCode ? data.phoneCode.trim() : null;
        }
        if (data.isActive !== undefined) {
            normalized.isActive = data.isActive;
        }
        return normalized;
    }
    /**
     * Converts domain model to API response format
     */
    toResponse() {
        return {
            id: this.id,
            name: this.name,
            code: this.code,
            alpha3: this.alpha3,
            numericCode: this.numericCode,
            continent: this.continent,
            region: this.region,
            currency: this.currency,
            phoneCode: this.phoneCode,
            isActive: this.isActive,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
        };
    }
    /**
     * Creates a Country instance from Prisma result
     */
    static fromPrisma(data) {
        return new Country({
            id: data.id,
            name: data.name,
            code: data.code,
            alpha3: data.alpha3,
            numericCode: data.numericCode,
            continent: data.continent,
            region: data.region,
            currency: data.currency,
            phoneCode: data.phoneCode,
            isActive: data.isActive,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        });
    }
}
exports.Country = Country;
//# sourceMappingURL=index.js.map