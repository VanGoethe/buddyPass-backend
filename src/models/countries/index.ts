/**
 * Country Domain Model
 */

import { Prisma } from "@prisma/client";
import {
  ICountry,
  CreateCountryData,
  UpdateCountryData,
  CountryResponse,
} from "../../types/countries";
import { ValidationError } from "../../utils/errors";

export type CountryRecord = Prisma.CountryGetPayload<Record<string, never>>;

interface NormalizedCountryData {
  name?: string;
  code?: string;
  alpha3?: string;
  numericCode?: string | null;
  continent?: string | null;
  region?: string | null;
  currencyId?: string | null;
  phoneCode?: string | null;
  isActive?: boolean;
}

export class Country implements ICountry {
  public readonly id: string;
  public readonly name: string;
  public readonly code: string;
  public readonly alpha3: string;
  public readonly numericCode?: string | null;
  public readonly continent?: string | null;
  public readonly region?: string | null;
  public readonly currencyId?: string | null;
  public readonly phoneCode?: string | null;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: ICountry) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.alpha3 = data.alpha3;
    this.numericCode = data.numericCode;
    this.continent = data.continent;
    this.region = data.region;
    this.currencyId = data.currencyId;
    this.phoneCode = data.phoneCode;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Validates country creation data
   */
  public static validateCreateData(data: CreateCountryData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Country name is required");
    }

    if (!data.code || data.code.trim().length === 0) {
      throw new ValidationError("Country ISO code is required");
    }

    if (!data.alpha3 || data.alpha3.trim().length === 0) {
      throw new ValidationError("Country alpha-3 code is required");
    }

    if (data.name.trim().length > 100) {
      throw new ValidationError("Country name must be 100 characters or less");
    }

    const codeRegex = /^[A-Z]{2}$/;
    if (!codeRegex.test(data.code.trim().toUpperCase())) {
      throw new ValidationError(
        "Country code must be a valid 2-letter ISO 3166-1 alpha-2 code",
      );
    }

    const alpha3Regex = /^[A-Z]{3}$/;
    if (!alpha3Regex.test(data.alpha3.trim().toUpperCase())) {
      throw new ValidationError(
        "Country alpha-3 code must be a valid 3-letter ISO 3166-1 alpha-3 code",
      );
    }

    if (data.numericCode) {
      const numericRegex = /^\d{3}$/;
      if (!numericRegex.test(data.numericCode.trim())) {
        throw new ValidationError(
          "Country numeric code must be a valid 3-digit ISO 3166-1 numeric code",
        );
      }
    }

    if (data.phoneCode) {
      const phoneCodeRegex = /^\+\d{1,4}$/;
      if (!phoneCodeRegex.test(data.phoneCode.trim())) {
        throw new ValidationError(
          "Phone code must be in format +X or +XXX or +XXXX",
        );
      }
    }
  }

  /**
   * Validates country update data
   */
  public static validateUpdateData(data: UpdateCountryData): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError("Country name is required");
      }

      if (data.name.trim().length > 100) {
        throw new ValidationError(
          "Country name must be 100 characters or less",
        );
      }
    }

    if (data.code !== undefined) {
      if (!data.code || data.code.trim().length === 0) {
        throw new ValidationError("Country ISO code is required");
      }

      const codeRegex = /^[A-Z]{2}$/;
      if (!codeRegex.test(data.code.trim().toUpperCase())) {
        throw new ValidationError(
          "Country code must be a valid 2-letter ISO 3166-1 alpha-2 code",
        );
      }
    }

    if (data.alpha3 !== undefined) {
      if (!data.alpha3 || data.alpha3.trim().length === 0) {
        throw new ValidationError("Country alpha-3 code is required");
      }

      const alpha3Regex = /^[A-Z]{3}$/;
      if (!alpha3Regex.test(data.alpha3.trim().toUpperCase())) {
        throw new ValidationError(
          "Country alpha-3 code must be a valid 3-letter ISO 3166-1 alpha-3 code",
        );
      }
    }

    if (data.numericCode !== undefined && data.numericCode) {
      const numericRegex = /^\d{3}$/;
      if (!numericRegex.test(data.numericCode.trim())) {
        throw new ValidationError(
          "Country numeric code must be a valid 3-digit ISO 3166-1 numeric code",
        );
      }
    }

    if (data.phoneCode !== undefined && data.phoneCode) {
      const phoneCodeRegex = /^\+\d{1,4}$/;
      if (!phoneCodeRegex.test(data.phoneCode.trim())) {
        throw new ValidationError(
          "Phone code must be in format +X or +XXX or +XXXX",
        );
      }
    }
  }

  /**
   * Normalizes country data for storage
   */
  public static normalizeData(
    data: CreateCountryData | UpdateCountryData,
  ): NormalizedCountryData {
    const normalized: NormalizedCountryData = {};

    if (data.name !== undefined) {
      normalized.name = data.name.trim();
    }

    if (data.code !== undefined) {
      normalized.code = data.code.trim().toUpperCase();
    }

    if (data.alpha3 !== undefined) {
      normalized.alpha3 = data.alpha3.trim().toUpperCase();
    }

    if (data.numericCode !== undefined) {
      normalized.numericCode = data.numericCode
        ? data.numericCode.trim()
        : null;
    }

    if (data.continent !== undefined) {
      normalized.continent = data.continent ? data.continent.trim() : null;
    }

    if (data.region !== undefined) {
      normalized.region = data.region ? data.region.trim() : null;
    }

    if (data.currencyId !== undefined) {
      normalized.currencyId = data.currencyId ? data.currencyId.trim() : null;
    }

    if (data.phoneCode !== undefined) {
      normalized.phoneCode = data.phoneCode ? data.phoneCode.trim() : null;
    }

    if (data.isActive !== undefined) {
      normalized.isActive = data.isActive;
    }

    return normalized;
  }

  /**
   * Converts domain model to API response format
   */
  public toResponse(): CountryResponse {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      alpha3: this.alpha3,
      numericCode: this.numericCode,
      continent: this.continent,
      region: this.region,
      currencyId: this.currencyId,
      phoneCode: this.phoneCode,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a Country instance from Prisma result
   */
  public static fromPrisma(data: CountryRecord): Country {
    return new Country({
      id: data.id,
      name: data.name,
      code: data.code,
      alpha3: data.alpha3,
      numericCode: data.numericCode,
      continent: data.continent,
      region: data.region,
      currencyId: data.currencyId,
      phoneCode: data.phoneCode,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
