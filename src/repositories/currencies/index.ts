/**
 * Currency Repository Implementation
 */

import { PrismaClient } from "@prisma/client";
import {
  ICurrency,
  CreateCurrencyData,
  UpdateCurrencyData,
  CurrencyQueryOptions,
  ICurrencyRepository,
} from "../../types/currencies";
import { Currency } from "../../models/currencies";

export class PrismaCurrencyRepository implements ICurrencyRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateCurrencyData): Promise<ICurrency> {
    try {
      Currency.validateCreateData(data);
      const normalizedData = Currency.normalizeData(data);

      // Check for duplicates
      const existingByCode = await this.existsByCode(normalizedData.code);
      if (existingByCode) {
        throw new Error(
          `Currency with code '${normalizedData.code}' already exists`
        );
      }

      const existingByName = await this.existsByName(normalizedData.name);
      if (existingByName) {
        throw new Error(
          `Currency with name '${normalizedData.name}' already exists`
        );
      }

      const createdCurrency = await this.prisma.currency.create({
        data: {
          ...normalizedData,
          isActive: normalizedData.isActive ?? true,
          minorUnit: normalizedData.minorUnit ?? 2,
        },
      });

      return Currency.fromPrisma(createdCurrency);
    } catch (error) {
      throw new Error(
        `Failed to create currency: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findById(id: string): Promise<ICurrency | null> {
    try {
      const currency = await this.prisma.currency.findUnique({
        where: { id },
      });

      return currency ? Currency.fromPrisma(currency) : null;
    } catch (error) {
      throw new Error(
        `Failed to find currency by ID: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findByCode(code: string): Promise<ICurrency | null> {
    try {
      const currency = await this.prisma.currency.findUnique({
        where: { code: code.toUpperCase() },
      });

      return currency ? Currency.fromPrisma(currency) : null;
    } catch (error) {
      throw new Error(
        `Failed to find currency by code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findMany(options: CurrencyQueryOptions = {}): Promise<{
    currencies: ICurrency[];
    total: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "asc",
        search,
        isActive,
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause
      const where: any = {};

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
      const orderBy: any = {};
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
        currencies: currencies.map((currency) => Currency.fromPrisma(currency)),
        total,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch currencies: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findActive(): Promise<ICurrency[]> {
    try {
      const currencies = await this.prisma.currency.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });

      return currencies.map((currency) => Currency.fromPrisma(currency));
    } catch (error) {
      throw new Error(
        `Failed to fetch active currencies: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async update(id: string, data: UpdateCurrencyData): Promise<ICurrency> {
    try {
      Currency.validateUpdateData(data);
      const normalizedData = Currency.normalizeData(data);

      // Check if currency exists
      const existingCurrency = await this.findById(id);
      if (!existingCurrency) {
        throw new Error("Currency not found");
      }

      // Check for duplicates (excluding current currency)
      if (normalizedData.code) {
        const existingByCode = await this.existsByCode(normalizedData.code, id);
        if (existingByCode) {
          throw new Error(
            `Currency with code '${normalizedData.code}' already exists`
          );
        }
      }

      if (normalizedData.name) {
        const existingByName = await this.existsByName(normalizedData.name, id);
        if (existingByName) {
          throw new Error(
            `Currency with name '${normalizedData.name}' already exists`
          );
        }
      }

      const updatedCurrency = await this.prisma.currency.update({
        where: { id },
        data: normalizedData,
      });

      return Currency.fromPrisma(updatedCurrency);
    } catch (error) {
      throw new Error(
        `Failed to update currency: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async delete(id: string): Promise<void> {
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
        throw new Error(
          "Cannot delete currency that is being used by countries or subscriptions"
        );
      }

      await this.prisma.currency.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error(
        `Failed to delete currency: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    try {
      const where: any = { code: code.toUpperCase() };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await this.prisma.currency.count({ where });
      return count > 0;
    } catch (error) {
      throw new Error(
        `Failed to check currency existence by code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    try {
      const where: any = { name: name.trim() };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await this.prisma.currency.count({ where });
      return count > 0;
    } catch (error) {
      throw new Error(
        `Failed to check currency existence by name: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

// Export a factory function to create repository instance
export const createCurrencyRepository = (
  prisma: PrismaClient
): ICurrencyRepository => {
  return new PrismaCurrencyRepository(prisma);
};
