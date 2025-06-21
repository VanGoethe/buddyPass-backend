/**
 * Currency Service Implementation
 */

import {
  ICurrencyService,
  ICurrencyRepository,
  CreateCurrencyData,
  UpdateCurrencyData,
  CurrencyResponse,
  CurrencyListResponse,
  CurrencyQueryOptions,
} from "../../types/currencies";
import { Currency } from "../../models/currencies";

export class CurrencyService implements ICurrencyService {
  constructor(private currencyRepository: ICurrencyRepository) {}

  async createCurrency(data: CreateCurrencyData): Promise<CurrencyResponse> {
    try {
      const currency = await this.currencyRepository.create(data);
      return Currency.fromPrisma(currency).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to create currency: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getCurrencyById(id: string): Promise<CurrencyResponse> {
    try {
      if (!id || id.trim().length === 0) {
        throw new Error("Currency ID is required");
      }

      const currency = await this.currencyRepository.findById(id.trim());
      if (!currency) {
        throw new Error("Currency not found");
      }

      return Currency.fromPrisma(currency).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to get currency: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getCurrencyByCode(code: string): Promise<CurrencyResponse> {
    try {
      if (!code || code.trim().length === 0) {
        throw new Error("Currency code is required");
      }

      const currency = await this.currencyRepository.findByCode(code.trim());
      if (!currency) {
        throw new Error("Currency not found");
      }

      return Currency.fromPrisma(currency).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to get currency by code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getCurrencies(
    options: CurrencyQueryOptions = {}
  ): Promise<CurrencyListResponse> {
    try {
      // Validate and sanitize query options
      const sanitizedOptions: CurrencyQueryOptions = {
        page: Math.max(1, options.page || 1),
        limit: Math.min(Math.max(1, options.limit || 10), 100), // Max 100 items per page
        sortBy: options.sortBy || "name",
        sortOrder: options.sortOrder || "asc",
        search: options.search?.trim(),
        isActive: options.isActive,
      };

      const { currencies, total } = await this.currencyRepository.findMany(
        sanitizedOptions
      );

      const page = sanitizedOptions.page!;
      const limit = sanitizedOptions.limit!;
      const totalPages = Math.ceil(total / limit);

      return {
        currencies: currencies.map((currency) =>
          Currency.fromPrisma(currency).toResponse()
        ),
        total,
        page,
        limit,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      throw new Error(
        `Failed to get currencies: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getActiveCurrencies(): Promise<CurrencyResponse[]> {
    try {
      const currencies = await this.currencyRepository.findActive();
      return currencies.map((currency) =>
        Currency.fromPrisma(currency).toResponse()
      );
    } catch (error) {
      throw new Error(
        `Failed to get active currencies: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async updateCurrency(
    id: string,
    data: UpdateCurrencyData
  ): Promise<CurrencyResponse> {
    try {
      if (!id || id.trim().length === 0) {
        throw new Error("Currency ID is required");
      }

      // Validate that at least one field is being updated
      const hasUpdates = Object.keys(data).some(
        (key) => data[key as keyof UpdateCurrencyData] !== undefined
      );
      if (!hasUpdates) {
        throw new Error("At least one field must be provided for update");
      }

      const updatedCurrency = await this.currencyRepository.update(
        id.trim(),
        data
      );
      return Currency.fromPrisma(updatedCurrency).toResponse();
    } catch (error) {
      throw new Error(
        `Failed to update currency: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async deleteCurrency(id: string): Promise<void> {
    try {
      if (!id || id.trim().length === 0) {
        throw new Error("Currency ID is required");
      }

      await this.currencyRepository.delete(id.trim());
    } catch (error) {
      throw new Error(
        `Failed to delete currency: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

// Export a factory function to create service instance
export const createCurrencyService = (
  currencyRepository: ICurrencyRepository
): ICurrencyService => {
  return new CurrencyService(currencyRepository);
};
