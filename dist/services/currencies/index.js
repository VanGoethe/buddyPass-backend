"use strict";
/**
 * Currency Service Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCurrencyService = exports.CurrencyService = void 0;
const currencies_1 = require("../../models/currencies");
class CurrencyService {
    constructor(currencyRepository) {
        this.currencyRepository = currencyRepository;
    }
    async createCurrency(data) {
        try {
            const currency = await this.currencyRepository.create(data);
            return currencies_1.Currency.fromPrisma(currency).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to create currency: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getCurrencyById(id) {
        try {
            if (!id || id.trim().length === 0) {
                throw new Error("Currency ID is required");
            }
            const currency = await this.currencyRepository.findById(id.trim());
            if (!currency) {
                throw new Error("Currency not found");
            }
            return currencies_1.Currency.fromPrisma(currency).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to get currency: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getCurrencyByCode(code) {
        try {
            if (!code || code.trim().length === 0) {
                throw new Error("Currency code is required");
            }
            const currency = await this.currencyRepository.findByCode(code.trim());
            if (!currency) {
                throw new Error("Currency not found");
            }
            return currencies_1.Currency.fromPrisma(currency).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to get currency by code: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getCurrencies(options = {}) {
        try {
            // Validate and sanitize query options
            const sanitizedOptions = {
                page: Math.max(1, options.page || 1),
                limit: Math.min(Math.max(1, options.limit || 10), 100), // Max 100 items per page
                sortBy: options.sortBy || "name",
                sortOrder: options.sortOrder || "asc",
                search: options.search?.trim(),
                isActive: options.isActive,
            };
            const { currencies, total } = await this.currencyRepository.findMany(sanitizedOptions);
            const page = sanitizedOptions.page;
            const limit = sanitizedOptions.limit;
            const totalPages = Math.ceil(total / limit);
            return {
                currencies: currencies.map((currency) => currencies_1.Currency.fromPrisma(currency).toResponse()),
                total,
                page,
                limit,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
            };
        }
        catch (error) {
            throw new Error(`Failed to get currencies: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getActiveCurrencies() {
        try {
            const currencies = await this.currencyRepository.findActive();
            return currencies.map((currency) => currencies_1.Currency.fromPrisma(currency).toResponse());
        }
        catch (error) {
            throw new Error(`Failed to get active currencies: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async updateCurrency(id, data) {
        try {
            if (!id || id.trim().length === 0) {
                throw new Error("Currency ID is required");
            }
            // Validate that at least one field is being updated
            const hasUpdates = Object.keys(data).some((key) => data[key] !== undefined);
            if (!hasUpdates) {
                throw new Error("At least one field must be provided for update");
            }
            const updatedCurrency = await this.currencyRepository.update(id.trim(), data);
            return currencies_1.Currency.fromPrisma(updatedCurrency).toResponse();
        }
        catch (error) {
            throw new Error(`Failed to update currency: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async deleteCurrency(id) {
        try {
            if (!id || id.trim().length === 0) {
                throw new Error("Currency ID is required");
            }
            await this.currencyRepository.delete(id.trim());
        }
        catch (error) {
            throw new Error(`Failed to delete currency: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
exports.CurrencyService = CurrencyService;
// Export a factory function to create service instance
const createCurrencyService = (currencyRepository) => {
    return new CurrencyService(currencyRepository);
};
exports.createCurrencyService = createCurrencyService;
//# sourceMappingURL=index.js.map