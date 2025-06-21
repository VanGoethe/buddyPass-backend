"use strict";
/**
 * Currency Repository Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCurrencyRepository = exports.PrismaCurrencyRepository = void 0;
const currencies_1 = require("../../models/currencies");
class PrismaCurrencyRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            currencies_1.Currency.validateCreateData(data);
            const normalizedData = currencies_1.Currency.normalizeData(data);
            // Check for duplicates
            const existingByCode = await this.existsByCode(normalizedData.code);
            if (existingByCode) {
                throw new Error(`Currency with code '${normalizedData.code}' already exists`);
            }
            const existingByName = await this.existsByName(normalizedData.name);
            if (existingByName) {
                throw new Error(`Currency with name '${normalizedData.name}' already exists`);
            }
            const createdCurrency = await this.prisma.currency.create({
                data: {
                    ...normalizedData,
                    isActive: normalizedData.isActive ?? true,
                    minorUnit: normalizedData.minorUnit ?? 2,
                },
            });
            return currencies_1.Currency.fromPrisma(createdCurrency);
        }
        catch (error) {
            throw new Error(`Failed to create currency: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findById(id) {
        try {
            const currency = await this.prisma.currency.findUnique({
                where: { id },
            });
            return currency ? currencies_1.Currency.fromPrisma(currency) : null;
        }
        catch (error) {
            throw new Error(`Failed to find currency by ID: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findByCode(code) {
        try {
            const currency = await this.prisma.currency.findUnique({
                where: { code: code.toUpperCase() },
            });
            return currency ? currencies_1.Currency.fromPrisma(currency) : null;
        }
        catch (error) {
            throw new Error(`Failed to find currency by code: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findMany(options = {}) {
        try {
            const { page = 1, limit = 10, sortBy = "name", sortOrder = "asc", search, isActive, } = options;
            const offset = (page - 1) * limit;
            // Build where clause
            const where = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                ];
            }
            if (isActive !== undefined) {
                where.isActive = isActive;
            }
            // Build order by clause
            const orderBy = {};
            orderBy[sortBy] = sortOrder;
            const [currencies, total] = await Promise.all([
                this.prisma.currency.findMany({
                    where,
                    orderBy,
                    skip: offset,
                    take: limit,
                }),
                this.prisma.currency.count({ where }),
            ]);
            return {
                currencies: currencies.map((currency) => currencies_1.Currency.fromPrisma(currency)),
                total,
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch currencies: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findActive() {
        try {
            const currencies = await this.prisma.currency.findMany({
                where: { isActive: true },
                orderBy: { name: "asc" },
            });
            return currencies.map((currency) => currencies_1.Currency.fromPrisma(currency));
        }
        catch (error) {
            throw new Error(`Failed to fetch active currencies: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async update(id, data) {
        try {
            currencies_1.Currency.validateUpdateData(data);
            const normalizedData = currencies_1.Currency.normalizeData(data);
            // Check if currency exists
            const existingCurrency = await this.findById(id);
            if (!existingCurrency) {
                throw new Error("Currency not found");
            }
            // Check for duplicates (excluding current currency)
            if (normalizedData.code) {
                const existingByCode = await this.existsByCode(normalizedData.code, id);
                if (existingByCode) {
                    throw new Error(`Currency with code '${normalizedData.code}' already exists`);
                }
            }
            if (normalizedData.name) {
                const existingByName = await this.existsByName(normalizedData.name, id);
                if (existingByName) {
                    throw new Error(`Currency with name '${normalizedData.name}' already exists`);
                }
            }
            const updatedCurrency = await this.prisma.currency.update({
                where: { id },
                data: normalizedData,
            });
            return currencies_1.Currency.fromPrisma(updatedCurrency);
        }
        catch (error) {
            throw new Error(`Failed to update currency: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async delete(id) {
        try {
            // Check if currency exists
            const existingCurrency = await this.findById(id);
            if (!existingCurrency) {
                throw new Error("Currency not found");
            }
            // Check if currency is being used
            const [countryCount, subscriptionCount] = await Promise.all([
                this.prisma.country.count({
                    where: { currencyId: id },
                }),
                this.prisma.subscription.count({
                    where: { currencyId: id },
                }),
            ]);
            if (countryCount > 0 || subscriptionCount > 0) {
                throw new Error("Cannot delete currency that is being used by countries or subscriptions");
            }
            await this.prisma.currency.delete({
                where: { id },
            });
        }
        catch (error) {
            throw new Error(`Failed to delete currency: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async existsByCode(code, excludeId) {
        try {
            const where = { code: code.toUpperCase() };
            if (excludeId) {
                where.id = { not: excludeId };
            }
            const count = await this.prisma.currency.count({ where });
            return count > 0;
        }
        catch (error) {
            throw new Error(`Failed to check currency existence by code: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async existsByName(name, excludeId) {
        try {
            const where = { name: name.trim() };
            if (excludeId) {
                where.id = { not: excludeId };
            }
            const count = await this.prisma.currency.count({ where });
            return count > 0;
        }
        catch (error) {
            throw new Error(`Failed to check currency existence by name: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
exports.PrismaCurrencyRepository = PrismaCurrencyRepository;
// Export a factory function to create repository instance
const createCurrencyRepository = (prisma) => {
    return new PrismaCurrencyRepository(prisma);
};
exports.createCurrencyRepository = createCurrencyRepository;
//# sourceMappingURL=index.js.map