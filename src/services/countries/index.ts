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
import { NotFoundError, ValidationError } from "../../utils/errors";

export class CountryService implements ICountryService {
  constructor(private countryRepository: ICountryRepository) {}

  async createCountry(data: CreateCountryData): Promise<CountryResponse> {
    const country = await this.countryRepository.create(data);
    return new Country(country).toResponse();
  }

  async getCountryById(id: string): Promise<CountryResponse> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Country ID is required");
    }

    const country = await this.countryRepository.findById(id.trim());
    if (!country) {
      throw new NotFoundError("Country not found");
    }

    return new Country(country).toResponse();
  }

  async getCountryByCode(code: string): Promise<CountryResponse> {
    if (!code || code.trim().length === 0) {
      throw new ValidationError("Country code is required");
    }

    const country = await this.countryRepository.findByCode(code.trim());
    if (!country) {
      throw new NotFoundError("Country not found");
    }

    return new Country(country).toResponse();
  }

  async getCountries(
    options: CountryQueryOptions = {},
  ): Promise<CountryListResponse> {
    const sanitizedOptions: CountryQueryOptions = {
      page: Math.max(1, options.page || 1),
      limit: Math.min(Math.max(1, options.limit || 10), 100),
      sortBy: options.sortBy || "name",
      sortOrder: options.sortOrder || "asc",
      search: options.search?.trim(),
      continent: options.continent?.trim(),
      region: options.region?.trim(),
      isActive: options.isActive,
    };

    const { countries, total } =
      await this.countryRepository.findMany(sanitizedOptions);

    const page = sanitizedOptions.page ?? 1;
    const limit = sanitizedOptions.limit ?? 10;
    const totalPages = Math.ceil(total / limit);

    return {
      countries: countries.map((country) => new Country(country).toResponse()),
      total,
      page,
      limit,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async getActiveCountries(): Promise<CountryResponse[]> {
    const countries = await this.countryRepository.findActive();
    return countries.map((country) => new Country(country).toResponse());
  }

  async updateCountry(
    id: string,
    data: UpdateCountryData,
  ): Promise<CountryResponse> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Country ID is required");
    }

    const hasUpdates = Object.keys(data).some(
      (key) => data[key as keyof UpdateCountryData] !== undefined,
    );
    if (!hasUpdates) {
      throw new ValidationError(
        "At least one field must be provided for update",
      );
    }

    const updatedCountry = await this.countryRepository.update(id.trim(), data);
    return new Country(updatedCountry).toResponse();
  }

  async deleteCountry(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Country ID is required");
    }

    await this.countryRepository.delete(id.trim());
  }
}

export const createCountryService = (
  countryRepository: ICountryRepository,
): ICountryService => {
  return new CountryService(countryRepository);
};
