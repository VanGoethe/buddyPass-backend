/**
 * Country Service Implementation
 */

import {
  ICountryService,
  ICountryRepository,
  CreateCountryData,
  UpdateCountryData,
  CountryResponse,
  CountryListResponse,
  CountryQueryOptions,
} from "../../types/countries";
import { Country } from "../../models/countries";

export class CountryService implements ICountryService {
  constructor(private countryRepository: ICountryRepository) {}

  async createCountry(data: CreateCountryData): Promise<CountryResponse> {
    try {
      const country = await this.countryRepository.create(data);
      return Country.fromPrisma(country).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to create country: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getCountryById(id: string): Promise<CountryResponse> {
    try {
      if (!id || id.trim().length === 0) {
        throw new Error("Country ID is required");
      }

      const country = await this.countryRepository.findById(id.trim());
      if (!country) {
        throw new Error("Country not found");
      }

      return Country.fromPrisma(country).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to get country: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getCountryByCode(code: string): Promise<CountryResponse> {
    try {
      if (!code || code.trim().length === 0) {
        throw new Error("Country code is required");
      }

      const country = await this.countryRepository.findByCode(code.trim());
      if (!country) {
        throw new Error("Country not found");
      }

      return Country.fromPrisma(country).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to get country by code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getCountries(
    options: CountryQueryOptions = {}
  ): Promise<CountryListResponse> {
    try {
      // Validate and sanitize query options
      const sanitizedOptions: CountryQueryOptions = {
        page: Math.max(1, options.page || 1),
        limit: Math.min(Math.max(1, options.limit || 10), 100), // Max 100 items per page
        sortBy: options.sortBy || "name",
        sortOrder: options.sortOrder || "asc",
        search: options.search?.trim(),
        continent: options.continent?.trim(),
        region: options.region?.trim(),
        isActive: options.isActive,
      };

      const { countries, total } = await this.countryRepository.findMany(
        sanitizedOptions
      );

      const page = sanitizedOptions.page!;
      const limit = sanitizedOptions.limit!;
      const totalPages = Math.ceil(total / limit);

      return {
        countries: countries.map((country) =>
          Country.fromPrisma(country).toResponse()
        ),
        total,
        page,
        limit,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      throw new Error(
        `Failed to get countries: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getActiveCountries(): Promise<CountryResponse[]> {
    try {
      const countries = await this.countryRepository.findActive();
      return countries.map((country) =>
        Country.fromPrisma(country).toResponse()
      );
    } catch (error) {
      throw new Error(
        `Failed to get active countries: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async updateCountry(
    id: string,
    data: UpdateCountryData
  ): Promise<CountryResponse> {
    try {
      if (!id || id.trim().length === 0) {
        throw new Error("Country ID is required");
      }

      // Validate that at least one field is being updated
      const hasUpdates = Object.keys(data).some(
        (key) => data[key as keyof UpdateCountryData] !== undefined
      );
      if (!hasUpdates) {
        throw new Error("At least one field must be provided for update");
      }

      const updatedCountry = await this.countryRepository.update(
        id.trim(),
        data
      );
      return Country.fromPrisma(updatedCountry).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to update country: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async deleteCountry(id: string): Promise<void> {
    try {
      if (!id || id.trim().length === 0) {
        throw new Error("Country ID is required");
      }

      await this.countryRepository.delete(id.trim());
    } catch (error) {
      throw new Error(
        `Failed to delete country: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

// Export a factory function to create service instance
export const createCountryService = (
  countryRepository: ICountryRepository
): ICountryService => {
  return new CountryService(countryRepository);
};
