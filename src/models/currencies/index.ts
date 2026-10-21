/**
 * Currency Domain Model
 */

import { Prisma } from "@prisma/client";
import {
  ICurrency,
  CreateCurrencyData,
  UpdateCurrencyData,
  CurrencyResponse,
} from "../../types/currencies";
import { ValidationError } from "../../utils/errors";

export type CurrencyRecord = Prisma.CurrencyGetPayload<Record<string, never>>;

interface NormalizedCurrencyData {
  name?: string;
  code?: string;
  symbol?: string | null;
  minorUnit?: number;
  isActive?: boolean;
}

export class Currency implements ICurrency {
  public readonly id: string;
  public readonly name: string;
  public readonly code: string;
  public readonly symbol?: string | null;
  public readonly minorUnit: number;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: ICurrency) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.symbol = data.symbol;
    this.minorUnit = data.minorUnit;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Validates currency creation data
   */
  public static validateCreateData(data: CreateCurrencyData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Currency name is required");
    }

    if (!data.code || data.code.trim().length === 0) {
      throw new ValidationError("Currency code is required");
    }

    if (data.name.trim().length > 100) {
      throw new ValidationError("Currency name must be 100 characters or less");
    }

    const codeRegex = /^[A-Z]{3}$/;
    if (!codeRegex.test(data.code.trim().toUpperCase())) {
      throw new ValidationError(
        "Currency code must be a valid 3-letter ISO 4217 code (e.g., USD, EUR, GBP)",
      );
    }

    if (data.symbol && data.symbol.trim().length > 5) {
      throw new ValidationError("Currency symbol must be 5 characters or less");
    }

    if (data.minorUnit !== undefined) {
      if (data.minorUnit < 0 || data.minorUnit > 6) {
        throw new ValidationError("Minor unit must be between 0 and 6");
      }
    }
  }

  /**
   * Validates currency update data
   */
  public static validateUpdateData(data: UpdateCurrencyData): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError("Currency name is required");
      }

      if (data.name.trim().length > 100) {
        throw new ValidationError(
          "Currency name must be 100 characters or less",
        );
      }
    }

    if (data.code !== undefined) {
      if (!data.code || data.code.trim().length === 0) {
        throw new ValidationError("Currency code is required");
      }

      const codeRegex = /^[A-Z]{3}$/;
      if (!codeRegex.test(data.code.trim().toUpperCase())) {
        throw new ValidationError(
          "Currency code must be a valid 3-letter ISO 4217 code (e.g., USD, EUR, GBP)",
        );
      }
    }

    if (data.symbol !== undefined && data.symbol) {
      if (data.symbol.trim().length > 5) {
        throw new ValidationError(
          "Currency symbol must be 5 characters or less",
        );
      }
    }

    if (data.minorUnit !== undefined) {
      if (data.minorUnit < 0 || data.minorUnit > 6) {
        throw new ValidationError("Minor unit must be between 0 and 6");
      }
    }
  }

  /**
   * Normalizes currency data for storage
   */
  public static normalizeData(
    data: CreateCurrencyData | UpdateCurrencyData,
  ): NormalizedCurrencyData {
    const normalized: NormalizedCurrencyData = {};

    if (data.name !== undefined) {
      normalized.name = data.name.trim();
    }

    if (data.code !== undefined) {
      normalized.code = data.code.trim().toUpperCase();
    }

    if (data.symbol !== undefined) {
      normalized.symbol = data.symbol ? data.symbol.trim() : null;
    }

    if (data.minorUnit !== undefined) {
      normalized.minorUnit = data.minorUnit;
    } else if ("minorUnit" in data && data.minorUnit === undefined) {
      normalized.minorUnit = 2;
    }

    if (data.isActive !== undefined) {
      normalized.isActive = data.isActive;
    }

    return normalized;
  }

  /**
   * Converts to API response format
   */
  public toResponse(): CurrencyResponse {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      symbol: this.symbol,
      minorUnit: this.minorUnit,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Creates Currency instance from Prisma result
   */
  public static fromPrisma(data: CurrencyRecord): Currency {
    return new Currency({
      id: data.id,
      name: data.name,
      code: data.code,
      symbol: data.symbol,
      minorUnit: data.minorUnit,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
