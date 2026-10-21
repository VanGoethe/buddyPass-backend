/**
 * ServiceProvider Service Implementation
 */

import {
  IServiceProviderService,
  IServiceProviderRepository,
  CreateServiceProviderData,
  UpdateServiceProviderData,
  ServiceProviderResponse,
  ServiceProviderListResponse,
  ServiceProviderQueryOptions,
} from "../../types/serviceProviders";
import { ICountryRepository } from "../../types/countries";
import { ServiceProvider } from "../../models/serviceProviders";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";

export class ServiceProviderService implements IServiceProviderService {
  constructor(
    private serviceProviderRepository: IServiceProviderRepository,
    private countryRepository: ICountryRepository,
  ) {}

  async createServiceProvider(
    data: CreateServiceProviderData,
  ): Promise<ServiceProviderResponse> {
    ServiceProvider.validateCreateData(data);

    if (data.supportedCountryIds && data.supportedCountryIds.length > 0) {
      await this.validateCountryIds(data.supportedCountryIds);
    }

    const nameExists = await this.serviceProviderRepository.existsByName(
      data.name,
    );
    if (nameExists) {
      throw new ConflictError(
        "A service provider with this name already exists",
      );
    }

    const serviceProvider = await this.serviceProviderRepository.create(data);
    const serviceProviderWithCountries =
      await this.serviceProviderRepository.findById(serviceProvider.id, true);

    if (!serviceProviderWithCountries) {
      throw new NotFoundError("Service provider not found");
    }

    return new ServiceProvider(serviceProviderWithCountries).toResponse();
  }

  async getServiceProviderById(id: string): Promise<ServiceProviderResponse> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Service provider ID is required");
    }

    const serviceProvider = await this.serviceProviderRepository.findById(
      id,
      true,
    );

    if (!serviceProvider) {
      throw new NotFoundError("Service provider not found");
    }

    return new ServiceProvider(serviceProvider).toResponse();
  }

  async getServiceProviders(
    options: ServiceProviderQueryOptions = {},
  ): Promise<ServiceProviderListResponse> {
    if (options.page !== undefined && options.page < 1) {
      throw new ValidationError("Page number must be greater than 0");
    }

    if (options.limit && (options.limit < 1 || options.limit > 100)) {
      throw new ValidationError("Limit must be between 1 and 100");
    }

    const { page = 1, limit = 10 } = options;
    const result = await this.serviceProviderRepository.findMany(options);
    const serviceProviders = result.serviceProviders.map((provider) =>
      new ServiceProvider(provider).toResponse(),
    );
    const totalPages = Math.ceil(result.total / limit);

    return {
      serviceProviders,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async updateServiceProvider(
    id: string,
    data: UpdateServiceProviderData,
  ): Promise<ServiceProviderResponse> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Service provider ID is required");
    }

    ServiceProvider.validateUpdateData(data);

    if (data.supportedCountryIds && data.supportedCountryIds.length > 0) {
      await this.validateCountryIds(data.supportedCountryIds);
    }

    const existingServiceProvider =
      await this.serviceProviderRepository.findById(id);
    if (!existingServiceProvider) {
      throw new NotFoundError("Service provider not found");
    }

    if (data.name) {
      const nameExists = await this.serviceProviderRepository.existsByName(
        data.name,
        id,
      );
      if (nameExists) {
        throw new ConflictError(
          "A service provider with this name already exists",
        );
      }
    }

    await this.serviceProviderRepository.update(id, data);

    const serviceProviderWithCountries =
      await this.serviceProviderRepository.findById(id, true);
    if (!serviceProviderWithCountries) {
      throw new NotFoundError("Service provider not found");
    }

    return new ServiceProvider(serviceProviderWithCountries).toResponse();
  }

  async deleteServiceProvider(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Service provider ID is required");
    }

    const existingServiceProvider =
      await this.serviceProviderRepository.findById(id);
    if (!existingServiceProvider) {
      throw new NotFoundError("Service provider not found");
    }

    await this.serviceProviderRepository.delete(id);
  }

  /**
   * Validates that all provided country IDs exist and are active
   */
  private async validateCountryIds(countryIds: string[]): Promise<void> {
    const uniqueCountryIds = [...new Set(countryIds)];

    for (const countryId of uniqueCountryIds) {
      const country = await this.countryRepository.findById(countryId);
      if (!country) {
        throw new NotFoundError(`Country with ID ${countryId} not found`);
      }
      if (!country.isActive) {
        throw new ValidationError(`Country ${country.name} is not active`);
      }
    }
  }
}

/**
 * Factory function to create ServiceProvider service
 */
export function createServiceProviderService(
  serviceProviderRepository: IServiceProviderRepository,
  countryRepository: ICountryRepository,
): IServiceProviderService {
  return new ServiceProviderService(
    serviceProviderRepository,
    countryRepository,
  );
}
