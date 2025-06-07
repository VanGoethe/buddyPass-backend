"use strict";
/**
 * Country Service Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCountryService = exports.CountryService = void 0;
const countries_1 = require("../../models/countries");
class CountryService {
    constructor(countryRepository) {
        this.countryRepository = countryRepository;
    }
    async createCountry(data) {
        try {
            const country = await this.countryRepository.create(data);
            return countries_1.Country.fromPrisma(country).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to create country: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getCountryById(id) {
        try {
            if (!id || id.trim().length === 0) {
                throw new Error("Country ID is required");
            }
            const country = await this.countryRepository.findById(id.trim());
            if (!country) {
                throw new Error("Country not found");
            }
            return countries_1.Country.fromPrisma(country).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to get country: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getCountryByCode(code) {
        try {
            if (!code || code.trim().length === 0) {
                throw new Error("Country code is required");
            }
            const country = await this.countryRepository.findByCode(code.trim());
            if (!country) {
                throw new Error("Country not found");
            }
            return countries_1.Country.fromPrisma(country).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to get country by code: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getCountries(options = {}) {
        try {
            // Validate and sanitize query options
            const sanitizedOptions = {
                page: Math.max(1, options.page || 1),
                limit: Math.min(Math.max(1, options.limit || 10), 100), // Max 100 items per page
                sortBy: options.sortBy || "name",
                sortOrder: options.sortOrder || "asc",
                search: options.search?.trim(),
                continent: options.continent?.trim(),
                region: options.region?.trim(),
                isActive: options.isActive,
            };
            const { countries, total } = await this.countryRepository.findMany(sanitizedOptions);
            const page = sanitizedOptions.page;
            const limit = sanitizedOptions.limit;
            const totalPages = Math.ceil(total / limit);
            return {
                countries: countries.map((country) => countries_1.Country.fromPrisma(country).toResponse()),
                total,
                page,
                limit,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
            };
        }
        catch (error) {
            throw new Error(`Failed to get countries: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getActiveCountries() {
        try {
            const countries = await this.countryRepository.findActive();
            return countries.map((country) => countries_1.Country.fromPrisma(country).toResponse());
        }
        catch (error) {
            throw new Error(`Failed to get active countries: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async updateCountry(id, data) {
        try {
            if (!id || id.trim().length === 0) {
                throw new Error("Country ID is required");
            }
            // Validate that at least one field is being updated
            const hasUpdates = Object.keys(data).some((key) => data[key] !== undefined);
            if (!hasUpdates) {
                throw new Error("At least one field must be provided for update");
            }
            const updatedCountry = await this.countryRepository.update(id.trim(), data);
            return countries_1.Country.fromPrisma(updatedCountry).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to update country: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async deleteCountry(id) {
        try {
            if (!id || id.trim().length === 0) {
                throw new Error("Country ID is required");
            }
            await this.countryRepository.delete(id.trim());
        }
        catch (error) {
            throw new Error(`Failed to delete country: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
exports.CountryService = CountryService;
// Export a factory function to create service instance
const createCountryService = (countryRepository) => {
    return new CountryService(countryRepository);
};
exports.createCountryService = createCountryService;
//# sourceMappingURL=index.js.map