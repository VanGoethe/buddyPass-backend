/**
 * Country Controller
 */

import { NextFunction, Request, Response } from "express";
import {
  ICountryService,
  CountryQueryOptions,
  CreateCountryData,
  UpdateCountryData,
} from "../../types/countries";
import { sendSuccess } from "../../utils/http";

const COUNTRY_SORT_FIELDS = ["name", "code", "createdAt", "updatedAt"] as const;

type CountrySortField = (typeof COUNTRY_SORT_FIELDS)[number];

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

function querySortField(value: unknown): CountrySortField | undefined {
  return COUNTRY_SORT_FIELDS.find((field) => field === value);
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

export class CountryController {
  constructor(private countryService: ICountryService) {}

  /**
   * Create a new country
   */
  async createCountry(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const country = await this.countryService.createCountry(
        req.body as CreateCountryData,
      );
      sendSuccess(res, country, "Country created successfully", 201);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get country by ID
   */
  async getCountryById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const country = await this.countryService.getCountryById(req.params.id);
      sendSuccess(res, country);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get country by code
   */
  async getCountryByCode(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const country = await this.countryService.getCountryByCode(
        req.params.code,
      );
      sendSuccess(res, country);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get all countries with pagination and filtering
   */
  async getCountries(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const options: CountryQueryOptions = {
        page: queryInt(req.query.page),
        limit: queryInt(req.query.limit),
        sortBy: querySortField(req.query.sortBy),
        sortOrder: querySortOrder(req.query.sortOrder),
        search: queryString(req.query.search),
        continent: queryString(req.query.continent),
        region: queryString(req.query.region),
        isActive: queryBoolean(req.query.isActive),
      };

      const result = await this.countryService.getCountries(options);
      sendSuccess(res, result);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get active countries
   */
  async getActiveCountries(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const countries = await this.countryService.getActiveCountries();
      sendSuccess(res, countries);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Update country
   */
  async updateCountry(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updatedCountry = await this.countryService.updateCountry(
        req.params.id,
        req.body as UpdateCountryData,
      );
      sendSuccess(res, updatedCountry, "Country updated successfully");
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Delete country
   */
  async deleteCountry(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await this.countryService.deleteCountry(req.params.id);
      sendSuccess(res, undefined, "Country deleted successfully");
    } catch (error: unknown) {
      next(error);
    }
  }
}

export const createCountryController = (
  countryService: ICountryService,
): CountryController => {
  return new CountryController(countryService);
};
