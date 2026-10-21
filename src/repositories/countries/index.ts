/**
 * Country Repository Implementation
 */

import { Prisma, PrismaClient } from "@prisma/client";
import {
  ICountry,
  CreateCountryData,
  UpdateCountryData,
  CountryQueryOptions,
  ICountryRepository,
} from "../../types/countries";
import { Country } from "../../models/countries";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";

export class PrismaCountryRepository implements ICountryRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateCountryData): Promise<ICountry> {
    Country.validateCreateData(data);
    const normalizedData = Country.normalizeData(data);

    if (
      !normalizedData.name ||
      !normalizedData.code ||
      !normalizedData.alpha3
    ) {
      throw new ValidationError(
        "Country name, code, and alpha-3 code are required",
      );
    }

    const existingByCode = await this.existsByCode(normalizedData.code);
    if (existingByCode) {
      throw new ConflictError(
        `Country with code '${normalizedData.code}' already exists`,
      );
    }

    const existingByAlpha3 = await this.existsByAlpha3(normalizedData.alpha3);
    if (existingByAlpha3) {
      throw new ConflictError(
        `Country with alpha-3 code '${normalizedData.alpha3}' already exists`,
      );
    }

    const existingByName = await this.existsByName(normalizedData.name);
    if (existingByName) {
      throw new ConflictError(
        `Country with name '${normalizedData.name}' already exists`,
      );
    }

    const createdCountry = await this.prisma.country.create({
      data: {
        name: normalizedData.name,
        code: normalizedData.code,
        alpha3: normalizedData.alpha3,
        numericCode: normalizedData.numericCode,
        continent: normalizedData.continent,
        region: normalizedData.region,
        currencyId: normalizedData.currencyId,
        phoneCode: normalizedData.phoneCode,
        isActive: normalizedData.isActive ?? true,
      },
    });

    return Country.fromPrisma(createdCountry);
  }

  async findById(id: string): Promise<ICountry | null> {
    const country = await this.prisma.country.findUnique({
      where: { id },
    });

    return country ? Country.fromPrisma(country) : null;
  }

  async findByCode(code: string): Promise<ICountry | null> {
    const country = await this.prisma.country.findUnique({
      where: { code: code.toUpperCase() },
    });

    return country ? Country.fromPrisma(country) : null;
  }

  async findByAlpha3(alpha3: string): Promise<ICountry | null> {
    const country = await this.prisma.country.findUnique({
      where: { alpha3: alpha3.toUpperCase() },
    });

    return country ? Country.fromPrisma(country) : null;
  }

  async findMany(options: CountryQueryOptions = {}): Promise<{
    countries: ICountry[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = "name",
      sortOrder = "asc",
      search,
      continent,
      region,
      isActive,
    } = options;

    const offset = (page - 1) * limit;
    const where: Prisma.CountryWhereInput = {};

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

    const orderBy: Prisma.CountryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

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
      countries: countries.map((country) => Country.fromPrisma(country)),
      total,
    };
  }

  async findActive(): Promise<ICountry[]> {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return countries.map((country) => Country.fromPrisma(country));
  }

  async update(id: string, data: UpdateCountryData): Promise<ICountry> {
    Country.validateUpdateData(data);
    const normalizedData = Country.normalizeData(data);

    const existingCountry = await this.findById(id);
    if (!existingCountry) {
      throw new NotFoundError("Country not found");
    }

    if (normalizedData.code && normalizedData.code !== existingCountry.code) {
      const existingByCode = await this.existsByCode(normalizedData.code, id);
      if (existingByCode) {
        throw new ConflictError(
          `Country with code '${normalizedData.code}' already exists`,
        );
      }
    }

    if (
      normalizedData.alpha3 &&
      normalizedData.alpha3 !== existingCountry.alpha3
    ) {
      const existingByAlpha3 = await this.existsByAlpha3(
        normalizedData.alpha3,
        id,
      );
      if (existingByAlpha3) {
        throw new ConflictError(
          `Country with alpha-3 code '${normalizedData.alpha3}' already exists`,
        );
      }
    }

    if (normalizedData.name && normalizedData.name !== existingCountry.name) {
      const existingByName = await this.existsByName(normalizedData.name, id);
      if (existingByName) {
        throw new ConflictError(
          `Country with name '${normalizedData.name}' already exists`,
        );
      }
    }

    const updatedCountry = await this.prisma.country.update({
      where: { id },
      data: {
        name: normalizedData.name,
        code: normalizedData.code,
        alpha3: normalizedData.alpha3,
        numericCode: normalizedData.numericCode,
        continent: normalizedData.continent,
        region: normalizedData.region,
        currencyId: normalizedData.currencyId,
        phoneCode: normalizedData.phoneCode,
        isActive: normalizedData.isActive,
      },
    });

    return Country.fromPrisma(updatedCountry);
  }

  async delete(id: string): Promise<void> {
    const existingCountry = await this.findById(id);
    if (!existingCountry) {
      throw new NotFoundError("Country not found");
    }

    const [serviceProviderCount, subscriptionCount] = await Promise.all([
      this.prisma.serviceProviderCountry.count({
        where: { countryId: id },
      }),
      this.prisma.subscription.count({
        where: { countryId: id },
      }),
    ]);

    if (serviceProviderCount > 0) {
      throw new ConflictError(
        "Cannot delete country that is being used by service providers",
      );
    }

    if (subscriptionCount > 0) {
      throw new ConflictError(
        "Cannot delete country that is being used by subscriptions",
      );
    }

    await this.prisma.country.delete({
      where: { id },
    });
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CountryWhereInput = { code: code.toUpperCase() };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.country.count({ where });
    return count > 0;
  }

  async existsByAlpha3(alpha3: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CountryWhereInput = { alpha3: alpha3.toUpperCase() };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.country.count({ where });
    return count > 0;
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CountryWhereInput = {
      name: { equals: name.trim(), mode: "insensitive" },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.country.count({ where });
    return count > 0;
  }
}

export const createCountryRepository = (
  prisma: PrismaClient,
): ICountryRepository => {
  return new PrismaCountryRepository(prisma);
};
