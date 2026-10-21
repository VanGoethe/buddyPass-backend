/**
 * Currency Controller
 */

import { NextFunction, Request, Response } from "express";
import {
  ICurrencyService,
  CurrencyQueryOptions,
  CreateCurrencyData,
  UpdateCurrencyData,
} from "../../types/currencies";
import { sendSuccess } from "../../utils/http";

const CURRENCY_SORT_FIELDS = [
  "name",
  "code",
  "createdAt",
  "updatedAt",
] as const;

type CurrencySortField = (typeof CURRENCY_SORT_FIELDS)[number];

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function queryInt(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function querySortField(value: unknown): CurrencySortField | undefined {
  return CURRENCY_SORT_FIELDS.find((field) => field === value);
}

function querySortOrder(value: unknown): "asc" | "desc" | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function queryBoolean(value: unknown): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

export class CurrencyController {
  constructor(private currencyService: ICurrencyService) {}

  /**
   * Create a new currency
   */
  async createCurrency(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const currency = await this.currencyService.createCurrency(
        req.body as CreateCurrencyData,
      );
      sendSuccess(res, currency, "Currency created successfully", 201);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get currency by ID
   */
  async getCurrencyById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const currency = await this.currencyService.getCurrencyById(
        req.params.id,
      );
      sendSuccess(res, currency);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get currency by code
   */
  async getCurrencyByCode(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const currency = await this.currencyService.getCurrencyByCode(
        req.params.code,
      );
      sendSuccess(res, currency);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get all currencies with pagination and filtering
   */
  async getCurrencies(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const options: CurrencyQueryOptions = {
        page: queryInt(req.query.page),
        limit: queryInt(req.query.limit),
        sortBy: querySortField(req.query.sortBy),
        sortOrder: querySortOrder(req.query.sortOrder),
        search: queryString(req.query.search),
        isActive: queryBoolean(req.query.isActive),
      };

      const result = await this.currencyService.getCurrencies(options);
      sendSuccess(res, result);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get active currencies
   */
  async getActiveCurrencies(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const currencies = await this.currencyService.getActiveCurrencies();
      sendSuccess(res, currencies);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Update currency
   */
  async updateCurrency(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updatedCurrency = await this.currencyService.updateCurrency(
        req.params.id,
        req.body as UpdateCurrencyData,
      );
      sendSuccess(res, updatedCurrency, "Currency updated successfully");
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Delete currency
   */
  async deleteCurrency(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await this.currencyService.deleteCurrency(req.params.id);
      sendSuccess(res, undefined, "Currency deleted successfully");
    } catch (error: unknown) {
      next(error);
    }
  }
}

export const createCurrencyController = (
  currencyService: ICurrencyService,
): CurrencyController => {
  return new CurrencyController(currencyService);
};
