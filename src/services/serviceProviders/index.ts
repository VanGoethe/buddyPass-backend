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

export class ServiceProviderService implements IServiceProviderService {
  constructor(
    private serviceProviderRepository: IServiceProviderRepository,
    private countryRepository: ICountryRepository
  ) {}

  async createServiceProvider(
    data: CreateServiceProviderData
  ): Promise<ServiceProviderResponse> {
    // Validate input data
    ServiceProvider.validateCreateData(data);

    // Validate country IDs if provided
    if (data.supportedCountryIds && data.supportedCountryIds.length > 0) {
      await this.validateCountryIds(data.supportedCountryIds);
    }

    // Check if name already exists
    const nameExists = await this.serviceProviderRepository.existsByName(
      data.name
    );
    if (nameExists) {
      throw new Error("A service provider with this name already exists");
    }

    // Create service provider
    const serviceProvider = await this.serviceProviderRepository.create(data);

    // Get with countries included
    const serviceProviderWithCountries =
      await this.serviceProviderRepository.findById(serviceProvider.id, true);

    return new ServiceProvider(serviceProviderWithCountries!).toResponse();
  }

  async getServiceProviderById(id: string): Promise<ServiceProviderResponse> {
    if (!id || id.trim().length === 0) {
      throw new Error("Service provider ID is required");
    }

    const serviceProvider = await this.serviceProviderRepository.findById(
      id,
      true
    );

    if (!serviceProvider) {
      throw new Error("Service provider not found");
    }

    return new ServiceProvider(serviceProvider).toResponse();
  }

  async getServiceProviders(
    options: ServiceProviderQueryOptions = {}
  ): Promise<ServiceProviderListResponse> {
    // Validate pagination parameters
    if (options.page !== undefined && options.page < 1) {
      throw new Error("Page number must be greater than 0");
    }

    if (options.limit && (options.limit < 1 || options.limit > 100)) {
      throw new Error("Limit must be between 1 and 100");
    }

    const { page = 1, limit = 10 } = options;

    const result = await this.serviceProviderRepository.findMany(options);

    const serviceProviders = result.serviceProviders.map((sp) =>
      new ServiceProvider(sp).toResponse()
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
    data: UpdateServiceProviderData
  ): Promise<ServiceProviderResponse> {
    if (!id || id.trim().length === 0) {
      throw new Error("Service provider ID is required");
    }

    // Validate input data
    ServiceProvider.validateUpdateData(data);

    // Validate country IDs if provided
    if (data.supportedCountryIds && data.supportedCountryIds.length > 0) {
      await this.validateCountryIds(data.supportedCountryIds);
    }

    // Check if service provider exists
    const existingServiceProvider =
      await this.serviceProviderRepository.findById(id);
    if (!existingServiceProvider) {
      throw new Error("Service provider not found");
    }

    // Check if new name conflicts with existing service provider
    if (data.name) {
      const nameExists = await this.serviceProviderRepository.existsByName(
        data.name,
        id
      );
      if (nameExists) {
        throw new Error("A service provider with this name already exists");
      }
    }

    // Update service provider
    const updatedServiceProvider = await this.serviceProviderRepository.update(
      id,
      data
    );

    // Get with countries included
    const serviceProviderWithCountries =
      await this.serviceProviderRepository.findById(id, true);

    return new ServiceProvider(serviceProviderWithCountries!).toResponse();
  }

  async deleteServiceProvider(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new Error("Service provider ID is required");
    }

    // Check if service provider exists
    const existingServiceProvider =
      await this.serviceProviderRepository.findById(id);
    if (!existingServiceProvider) {
      throw new Error("Service provider not found");
    }

    // Delete service provider
    await this.serviceProviderRepository.delete(id);
  }

  /**
   * Validates that all provided country IDs exist
   */
  private async validateCountryIds(countryIds: string[]): Promise<void> {
    const uniqueCountryIds = [...new Set(countryIds)];

    for (const countryId of uniqueCountryIds) {
      const country = await this.countryRepository.findById(countryId);
      if (!country) {
        throw new Error(`Country with ID ${countryId} not found`);
      }
      if (!country.isActive) {
        throw new Error(`Country ${country.name} is not active`);
      }
    }
  }
}

/**
 * Factory function to create ServiceProvider service
 */
export function createServiceProviderService(
  serviceProviderRepository: IServiceProviderRepository,
  countryRepository: ICountryRepository
): IServiceProviderService {
  return new ServiceProviderService(
    serviceProviderRepository,
    countryRepository
  );
}
