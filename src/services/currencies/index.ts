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
import { NotFoundError, ValidationError } from "../../utils/errors";

export class CurrencyService implements ICurrencyService {
  constructor(private currencyRepository: ICurrencyRepository) {}

  async createCurrency(data: CreateCurrencyData): Promise<CurrencyResponse> {
    const currency = await this.currencyRepository.create(data);
    return new Currency(currency).toResponse();
  }

  async getCurrencyById(id: string): Promise<CurrencyResponse> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Currency ID is required");
    }

    const currency = await this.currencyRepository.findById(id.trim());
    if (!currency) {
      throw new NotFoundError("Currency not found");
    }

    return new Currency(currency).toResponse();
  }

  async getCurrencyByCode(code: string): Promise<CurrencyResponse> {
    if (!code || code.trim().length === 0) {
      throw new ValidationError("Currency code is required");
    }

    const currency = await this.currencyRepository.findByCode(code.trim());
    if (!currency) {
      throw new NotFoundError("Currency not found");
    }

    return new Currency(currency).toResponse();
  }

  async getCurrencies(
    options: CurrencyQueryOptions = {},
  ): Promise<CurrencyListResponse> {
    const sanitizedOptions: CurrencyQueryOptions = {
      page: Math.max(1, options.page || 1),
      limit: Math.min(Math.max(1, options.limit || 10), 100),
      sortBy: options.sortBy || "name",
      sortOrder: options.sortOrder || "asc",
      search: options.search?.trim(),
      isActive: options.isActive,
    };

    const { currencies, total } =
      await this.currencyRepository.findMany(sanitizedOptions);

    const page = sanitizedOptions.page ?? 1;
    const limit = sanitizedOptions.limit ?? 10;
    const totalPages = Math.ceil(total / limit);

    return {
      currencies: currencies.map((currency) =>
        new Currency(currency).toResponse(),
      ),
      total,
      page,
      limit,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async getActiveCurrencies(): Promise<CurrencyResponse[]> {
    const currencies = await this.currencyRepository.findActive();
    return currencies.map((currency) => new Currency(currency).toResponse());
  }

  async updateCurrency(
    id: string,
    data: UpdateCurrencyData,
  ): Promise<CurrencyResponse> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Currency ID is required");
    }

    const hasUpdates = Object.keys(data).some(
      (key) => data[key as keyof UpdateCurrencyData] !== undefined,
    );
    if (!hasUpdates) {
      throw new ValidationError(
        "At least one field must be provided for update",
      );
    }

    const updatedCurrency = await this.currencyRepository.update(
      id.trim(),
      data,
    );
    return new Currency(updatedCurrency).toResponse();
  }

  async deleteCurrency(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new ValidationError("Currency ID is required");
    }

    await this.currencyRepository.delete(id.trim());
  }
}

export const createCurrencyService = (
  currencyRepository: ICurrencyRepository,
): ICurrencyService => {
  return new CurrencyService(currencyRepository);
};
