/**
 * ServiceProvider Repository Implementation
 */

import { Prisma, PrismaClient } from "@prisma/client";
import {
  IServiceProviderRepository,
  IServiceProvider,
  CreateServiceProviderData,
  UpdateServiceProviderData,
  ServiceProviderQueryOptions,
} from "../../types/serviceProviders";
import { ICountry } from "../../types/countries";
import { ServiceProvider } from "../../models/serviceProviders";

function toJsonInput(
  value: Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.DbNull;
  }
  return value as Prisma.InputJsonValue;
}

const providerWithCountries = {
  supportedCountries: {
    include: {
      country: true,
    },
  },
} satisfies Prisma.ServiceProviderInclude;

export class PrismaServiceProviderRepository implements IServiceProviderRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateServiceProviderData): Promise<IServiceProvider> {
    const result = await this.prisma.$transaction(async (tx) => {
      const serviceProvider = await tx.serviceProvider.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          metadata: toJsonInput(data.metadata) ?? Prisma.DbNull,
        },
      });

      if (data.supportedCountryIds && data.supportedCountryIds.length > 0) {
        await tx.serviceProviderCountry.createMany({
          data: data.supportedCountryIds.map((countryId) => ({
            serviceProviderId: serviceProvider.id,
            countryId,
          })),
        });
      }

      return serviceProvider;
    });

    return ServiceProvider.fromPrisma(result);
  }

  async findById(
    id: string,
    includeCountries = false,
  ): Promise<IServiceProvider | null> {
    if (includeCountries) {
      const serviceProvider = await this.prisma.serviceProvider.findUnique({
        where: { id },
        include: providerWithCountries,
      });

      return serviceProvider
        ? ServiceProvider.fromPrisma(serviceProvider)
        : null;
    }

    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id },
    });

    return serviceProvider ? ServiceProvider.fromPrisma(serviceProvider) : null;
  }

  async findMany(options: ServiceProviderQueryOptions = {}): Promise<{
    serviceProviders: IServiceProvider[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      countryId,
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);
    const where: Prisma.ServiceProviderWhereInput = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (countryId) {
      where.supportedCountries = {
        some: {
          countryId,
        },
      };
    }

    const orderBy: Prisma.ServiceProviderOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [serviceProviders, total] = await Promise.all([
      this.prisma.serviceProvider.findMany({
        where,
        skip,
        take,
        orderBy,
        include: providerWithCountries,
      }),
      this.prisma.serviceProvider.count({ where }),
    ]);

    return {
      serviceProviders: serviceProviders.map((provider) =>
        ServiceProvider.fromPrisma(provider),
      ),
      total,
    };
  }

  async update(
    id: string,
    data: UpdateServiceProviderData,
  ): Promise<IServiceProvider> {
    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.ServiceProviderUpdateInput = {};

      if (data.name !== undefined) {
        updateData.name = data.name.trim();
      }

      if (data.description !== undefined) {
        updateData.description = data.description?.trim() || null;
      }

      if (data.metadata !== undefined) {
        updateData.metadata = toJsonInput(data.metadata);
      }

      const serviceProvider = await tx.serviceProvider.update({
        where: { id },
        data: updateData,
      });

      if (data.supportedCountryIds !== undefined) {
        await tx.serviceProviderCountry.deleteMany({
          where: { serviceProviderId: id },
        });

        if (data.supportedCountryIds.length > 0) {
          await tx.serviceProviderCountry.createMany({
            data: data.supportedCountryIds.map((countryId) => ({
              serviceProviderId: id,
              countryId,
            })),
          });
        }
      }

      return serviceProvider;
    });

    return ServiceProvider.fromPrisma(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.serviceProvider.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return this.prisma.serviceProvider.count();
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.ServiceProviderWhereInput = {
      name: {
        equals: name.trim(),
        mode: "insensitive",
      },
    };

    if (excludeId) {
      where.id = {
        not: excludeId,
      };
    }

    const count = await this.prisma.serviceProvider.count({ where });
    return count > 0;
  }

  async addSupportedCountries(
    serviceProviderId: string,
    countryIds: string[],
  ): Promise<void> {
    await this.prisma.serviceProviderCountry.createMany({
      data: countryIds.map((countryId) => ({
        serviceProviderId,
        countryId,
      })),
      skipDuplicates: true,
    });
  }

  async removeSupportedCountries(
    serviceProviderId: string,
    countryIds: string[],
  ): Promise<void> {
    await this.prisma.serviceProviderCountry.deleteMany({
      where: {
        serviceProviderId,
        countryId: {
          in: countryIds,
        },
      },
    });
  }

  async getSupportedCountries(serviceProviderId: string): Promise<ICountry[]> {
    const relationships = await this.prisma.serviceProviderCountry.findMany({
      where: { serviceProviderId },
      include: {
        country: true,
      },
    });

    return relationships.map((relation) => ({
      id: relation.country.id,
      name: relation.country.name,
      code: relation.country.code,
      alpha3: relation.country.alpha3,
      numericCode: relation.country.numericCode,
      continent: relation.country.continent,
      region: relation.country.region,
      currencyId: relation.country.currencyId,
      phoneCode: relation.country.phoneCode,
      isActive: relation.country.isActive,
      createdAt: relation.country.createdAt,
      updatedAt: relation.country.updatedAt,
    }));
  }
}

/**
 * Factory function to create ServiceProvider repository
 */
export function createServiceProviderRepository(
  prisma: PrismaClient,
): IServiceProviderRepository {
  return new PrismaServiceProviderRepository(prisma);
}
