"use strict";
/**
 * Country Repository Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCountryRepository = exports.PrismaCountryRepository = void 0;
const countries_1 = require("../../models/countries");
class PrismaCountryRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            countries_1.Country.validateCreateData(data);
            const normalizedData = countries_1.Country.normalizeData(data);
            // Check for duplicates
            const existingByCode = await this.existsByCode(normalizedData.code);
            if (existingByCode) {
                throw new Error(`Country with code '${normalizedData.code}' already exists`);
            }
            const existingByAlpha3 = await this.existsByAlpha3(normalizedData.alpha3);
            if (existingByAlpha3) {
                throw new Error(`Country with alpha-3 code '${normalizedData.alpha3}' already exists`);
            }
            const existingByName = await this.existsByName(normalizedData.name);
            if (existingByName) {
                throw new Error(`Country with name '${normalizedData.name}' already exists`);
            }
            const createdCountry = await this.prisma.country.create({
                data: {
                    ...normalizedData,
                    isActive: normalizedData.isActive ?? true,
                },
            });
            return countries_1.Country.fromPrisma(createdCountry);
        }
        catch (error) {
            throw new Error(`Failed to create country: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findById(id) {
        try {
            const country = await this.prisma.country.findUnique({
                where: { id },
            });
            return country ? countries_1.Country.fromPrisma(country) : null;
        }
        catch (error) {
            throw new Error(`Failed to find country by ID: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findByCode(code) {
        try {
            const country = await this.prisma.country.findUnique({
                where: { code: code.toUpperCase() },
            });
            return country ? countries_1.Country.fromPrisma(country) : null;
        }
        catch (error) {
            throw new Error(`Failed to find country by code: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findByAlpha3(alpha3) {
        try {
            const country = await this.prisma.country.findUnique({
                where: { alpha3: alpha3.toUpperCase() },
            });
            return country ? countries_1.Country.fromPrisma(country) : null;
        }
        catch (error) {
            throw new Error(`Failed to find country by alpha-3 code: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findMany(options = {}) {
        try {
            const { page = 1, limit = 10, sortBy = "name", sortOrder = "asc", search, continent, region, isActive, } = options;
            const offset = (page - 1) * limit;
            // Build where clause
            const where = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                    { alpha3: { contains: search, mode: "insensitive" } },
                ];
            }
            if (continent) {
                where.continent = { contains: continent, mode: "insensitive" };
            }
            if (region) {
                where.region = { contains: region, mode: "insensitive" };
            }
            if (isActive !== undefined) {
                where.isActive = isActive;
            }
            // Build order by clause
            const orderBy = {};
            orderBy[sortBy] = sortOrder;
            const [countries, total] = await Promise.all([
                this.prisma.country.findMany({
                    where,
                    orderBy,
                    skip: offset,
                    take: limit,
                }),
                this.prisma.country.count({ where }),
            ]);
            return {
                countries: countries.map((country) => countries_1.Country.fromPrisma(country)),
                total,
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch countries: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async findActive() {
        try {
            const countries = await this.prisma.country.findMany({
                where: { isActive: true },
                orderBy: { name: "asc" },
            });
            return countries.map((country) => countries_1.Country.fromPrisma(country));
        }
        catch (error) {
            throw new Error(`Failed to fetch active countries: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async update(id, data) {
        try {
            countries_1.Country.validateUpdateData(data);
            const normalizedData = countries_1.Country.normalizeData(data);
            // Check if country exists
            const existingCountry = await this.findById(id);
            if (!existingCountry) {
                throw new Error("Country not found");
            }
            // Check for duplicates if fields are being updated
            if (normalizedData.code && normalizedData.code !== existingCountry.code) {
                const existingByCode = await this.existsByCode(normalizedData.code, id);
                if (existingByCode) {
                    throw new Error(`Country with code '${normalizedData.code}' already exists`);
                }
            }
            if (normalizedData.alpha3 &&
                normalizedData.alpha3 !== existingCountry.alpha3) {
                const existingByAlpha3 = await this.existsByAlpha3(normalizedData.alpha3, id);
                if (existingByAlpha3) {
                    throw new Error(`Country with alpha-3 code '${normalizedData.alpha3}' already exists`);
                }
            }
            if (normalizedData.name && normalizedData.name !== existingCountry.name) {
                const existingByName = await this.existsByName(normalizedData.name, id);
                if (existingByName) {
                    throw new Error(`Country with name '${normalizedData.name}' already exists`);
                }
            }
            const updatedCountry = await this.prisma.country.update({
                where: { id },
                data: normalizedData,
            });
            return countries_1.Country.fromPrisma(updatedCountry);
        }
        catch (error) {
            throw new Error(`Failed to update country: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async delete(id) {
        try {
            // Check if country exists
            const existingCountry = await this.findById(id);
            if (!existingCountry) {
                throw new Error("Country not found");
            }
            // Check if country is being used by service providers or subscriptions
            const [serviceProviderCount, subscriptionCount] = await Promise.all([
                this.prisma.serviceProviderCountry.count({
                    where: { countryId: id },
                }),
                this.prisma.subscription.count({
                    where: { countryId: id },
                }),
            ]);
            if (serviceProviderCount > 0) {
                throw new Error("Cannot delete country that is being used by service providers");
            }
            if (subscriptionCount > 0) {
                throw new Error("Cannot delete country that is being used by subscriptions");
            }
            await this.prisma.country.delete({
                where: { id },
            });
        }
        catch (error) {
            throw new Error(`Failed to delete country: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async existsByCode(code, excludeId) {
        try {
            const where = { code: code.toUpperCase() };
            if (excludeId) {
                where.id = { not: excludeId };
            }
            const count = await this.prisma.country.count({ where });
            return count > 0;
        }
        catch (error) {
            throw new Error(`Failed to check if country exists by code: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async existsByAlpha3(alpha3, excludeId) {
        try {
            const where = { alpha3: alpha3.toUpperCase() };
            if (excludeId) {
                where.id = { not: excludeId };
            }
            const count = await this.prisma.country.count({ where });
            return count > 0;
        }
        catch (error) {
            throw new Error(`Failed to check if country exists by alpha-3: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async existsByName(name, excludeId) {
        try {
            const where = { name: { equals: name.trim(), mode: "insensitive" } };
            if (excludeId) {
                where.id = { not: excludeId };
            }
            const count = await this.prisma.country.count({ where });
            return count > 0;
        }
        catch (error) {
            throw new Error(`Failed to check if country exists by name: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
exports.PrismaCountryRepository = PrismaCountryRepository;
// Export a factory function to create repository instance
const createCountryRepository = (prisma) => {
    return new PrismaCountryRepository(prisma);
};
exports.createCountryRepository = createCountryRepository;
//# sourceMappingURL=index.js.map