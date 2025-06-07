/**
 * ServiceProvider Repository Implementation
 */

import { PrismaClient } from "@prisma/client";
import {
  IServiceProviderRepository,
  IServiceProvider,
  CreateServiceProviderData,
  UpdateServiceProviderData,
  ServiceProviderQueryOptions,
} from "../../types/serviceProviders";
import { ICountry } from "../../types/countries";
import { ServiceProvider } from "../../models/serviceProviders";

export class PrismaServiceProviderRepository
  implements IServiceProviderRepository
{
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateServiceProviderData): Promise<IServiceProvider> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the service provider
        const serviceProvider = await tx.serviceProvider.create({
          data: {
            name: data.name.trim(),
            description: data.description?.trim() || null,
            metadata: (data.metadata as any) || null,
          },
        });

        // Add supported countries if provided
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
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("A service provider with this name already exists");
      }
      if (error.code === "P2003") {
        throw new Error("One or more country IDs are invalid");
      }
      throw new Error(`Failed to create service provider: ${error.message}`);
    }
  }

  async findById(
    id: string,
    includeCountries = false
  ): Promise<IServiceProvider | null> {
    try {
      const include: any = {};
      if (includeCountries) {
        include.supportedCountries = {
          include: {
            country: true,
          },
        };
      }

      const serviceProvider = await this.prisma.serviceProvider.findUnique({
        where: { id },
        include,
      });

      return serviceProvider
        ? ServiceProvider.fromPrisma(serviceProvider)
        : null;
    } catch (error: any) {
      throw new Error(`Failed to find service provider: ${error.message}`);
    }
  }

  async findMany(options: ServiceProviderQueryOptions = {}): Promise<{
    serviceProviders: IServiceProvider[];
    total: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        countryId,
      } = options;

      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100); // Cap at 100 items per page

      // Build where clause for search
      const where: any = {};
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

      // Filter by country if provided
      if (countryId) {
        where.supportedCountries = {
          some: {
            countryId,
          },
        };
      }

      // Build orderBy clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [serviceProviders, total] = await Promise.all([
        this.prisma.serviceProvider.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            supportedCountries: {
              include: {
                country: true,
              },
            },
          },
        }),
        this.prisma.serviceProvider.count({ where }),
      ]);

      return {
        serviceProviders: serviceProviders.map((sp) =>
          ServiceProvider.fromPrisma(sp)
        ),
        total,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch service providers: ${error.message}`);
    }
  }

  async update(
    id: string,
    data: UpdateServiceProviderData
  ): Promise<IServiceProvider> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updateData: any = {};

        if (data.name !== undefined) {
          updateData.name = data.name.trim();
        }

        if (data.description !== undefined) {
          updateData.description = data.description?.trim() || null;
        }

        if (data.metadata !== undefined) {
          updateData.metadata = (data.metadata as any) || null;
        }

        const serviceProvider = await tx.serviceProvider.update({
          where: { id },
          data: updateData,
        });

        // Update supported countries if provided
        if (data.supportedCountryIds !== undefined) {
          // Remove existing country associations
          await tx.serviceProviderCountry.deleteMany({
            where: { serviceProviderId: id },
          });

          // Add new country associations if any
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
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new Error("Service provider not found");
      }
      if (error.code === "P2002") {
        throw new Error("A service provider with this name already exists");
      }
      if (error.code === "P2003") {
        throw new Error("One or more country IDs are invalid");
      }
      throw new Error(`Failed to update service provider: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.serviceProvider.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new Error("Service provider not found");
      }
      if (error.code === "P2003") {
        throw new Error(
          "Cannot delete service provider: it has associated subscriptions"
        );
      }
      throw new Error(`Failed to delete service provider: ${error.message}`);
    }
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    try {
      const where: any = {
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
    } catch (error: any) {
      throw new Error(
        `Failed to check service provider name: ${error.message}`
      );
    }
  }

  async addSupportedCountries(
    serviceProviderId: string,
    countryIds: string[]
  ): Promise<void> {
    try {
      await this.prisma.serviceProviderCountry.createMany({
        data: countryIds.map((countryId) => ({
          serviceProviderId,
          countryId,
        })),
        skipDuplicates: true,
      });
    } catch (error: any) {
      if (error.code === "P2003") {
        throw new Error("Service provider or one or more countries not found");
      }
      throw new Error(`Failed to add supported countries: ${error.message}`);
    }
  }

  async removeSupportedCountries(
    serviceProviderId: string,
    countryIds: string[]
  ): Promise<void> {
    try {
      await this.prisma.serviceProviderCountry.deleteMany({
        where: {
          serviceProviderId,
          countryId: {
            in: countryIds,
          },
        },
      });
    } catch (error: any) {
      throw new Error(`Failed to remove supported countries: ${error.message}`);
    }
  }

  async getSupportedCountries(serviceProviderId: string): Promise<ICountry[]> {
    try {
      const relationships = await this.prisma.serviceProviderCountry.findMany({
        where: { serviceProviderId },
        include: {
          country: true,
        },
      });

      return relationships.map((rel) => rel.country);
    } catch (error: any) {
      throw new Error(`Failed to get supported countries: ${error.message}`);
    }
  }
}

/**
 * Factory function to create ServiceProvider repository
 */
export function createServiceProviderRepository(
  prisma: PrismaClient
): IServiceProviderRepository {
  return new PrismaServiceProviderRepository(prisma);
}
