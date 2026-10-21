/**
 * Currency Repository Implementation
 */

import { Prisma, PrismaClient } from "@prisma/client";
import {
  ICurrency,
  CreateCurrencyData,
  UpdateCurrencyData,
  CurrencyQueryOptions,
  ICurrencyRepository,
} from "../../types/currencies";
import { Currency } from "../../models/currencies";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";

export class PrismaCurrencyRepository implements ICurrencyRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateCurrencyData): Promise<ICurrency> {
    Currency.validateCreateData(data);
    const normalizedData = Currency.normalizeData(data);

    if (!normalizedData.name || !normalizedData.code) {
      throw new ValidationError("Currency name and code are required");
    }

    const existingByCode = await this.existsByCode(normalizedData.code);
    if (existingByCode) {
      throw new ConflictError(
        `Currency with code '${normalizedData.code}' already exists`,
      );
    }

    const existingByName = await this.existsByName(normalizedData.name);
    if (existingByName) {
      throw new ConflictError(
        `Currency with name '${normalizedData.name}' already exists`,
      );
    }

    const createdCurrency = await this.prisma.currency.create({
      data: {
        name: normalizedData.name,
        code: normalizedData.code,
        symbol: normalizedData.symbol,
        minorUnit: normalizedData.minorUnit ?? 2,
        isActive: normalizedData.isActive ?? true,
      },
    });

    return Currency.fromPrisma(createdCurrency);
  }

  async findById(id: string): Promise<ICurrency | null> {
    const currency = await this.prisma.currency.findUnique({
      where: { id },
    });

    return currency ? Currency.fromPrisma(currency) : null;
  }

  async findByCode(code: string): Promise<ICurrency | null> {
    const currency = await this.prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    });

    return currency ? Currency.fromPrisma(currency) : null;
  }

  async findMany(options: CurrencyQueryOptions = {}): Promise<{
    currencies: ICurrency[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = "name",
      sortOrder = "asc",
      search,
      isActive,
    } = options;

    const offset = (page - 1) * limit;
    const where: Prisma.CurrencyWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy: Prisma.CurrencyOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

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
  }

  async findActive(): Promise<ICurrency[]> {
    const currencies = await this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return currencies.map((currency) => Currency.fromPrisma(currency));
  }

  async update(id: string, data: UpdateCurrencyData): Promise<ICurrency> {
    Currency.validateUpdateData(data);
    const normalizedData = Currency.normalizeData(data);

    const existingCurrency = await this.findById(id);
    if (!existingCurrency) {
      throw new NotFoundError("Currency not found");
    }

    if (normalizedData.code) {
      const existingByCode = await this.existsByCode(normalizedData.code, id);
      if (existingByCode) {
        throw new ConflictError(
          `Currency with code '${normalizedData.code}' already exists`,
        );
      }
    }

    if (normalizedData.name) {
      const existingByName = await this.existsByName(normalizedData.name, id);
      if (existingByName) {
        throw new ConflictError(
          `Currency with name '${normalizedData.name}' already exists`,
        );
      }
    }

    const updatedCurrency = await this.prisma.currency.update({
      where: { id },
      data: {
        name: normalizedData.name,
        code: normalizedData.code,
        symbol: normalizedData.symbol,
        minorUnit: normalizedData.minorUnit,
        isActive: normalizedData.isActive,
      },
    });

    return Currency.fromPrisma(updatedCurrency);
  }

  async delete(id: string): Promise<void> {
    const existingCurrency = await this.findById(id);
    if (!existingCurrency) {
      throw new NotFoundError("Currency not found");
    }

    const [countryCount, subscriptionCount] = await Promise.all([
      this.prisma.country.count({
        where: { currencyId: id },
      }),
      this.prisma.subscription.count({
        where: { currencyId: id },
      }),
    ]);

    if (countryCount > 0 || subscriptionCount > 0) {
      throw new ConflictError(
        "Cannot delete currency that is being used by countries or subscriptions",
      );
    }

    await this.prisma.currency.delete({
      where: { id },
    });
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CurrencyWhereInput = { code: code.toUpperCase() };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.currency.count({ where });
    return count > 0;
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CurrencyWhereInput = { name: name.trim() };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.currency.count({ where });
    return count > 0;
  }
}

export const createCurrencyRepository = (
  prisma: PrismaClient,
): ICurrencyRepository => {
  return new PrismaCurrencyRepository(prisma);
};
