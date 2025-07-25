/**
 * Country Domain Model
 */

import {
  ICountry,
  CreateCountryData,
  UpdateCountryData,
  CountryResponse,
} from "../../types/countries";

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
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Country name is required");
    }

    if (!data.code || data.code.trim().length === 0) {
      throw new Error("Country ISO code is required");
    }

    if (!data.alpha3 || data.alpha3.trim().length === 0) {
      throw new Error("Country alpha-3 code is required");
    }

    // Validate field lengths
    if (data.name.trim().length > 100) {
      throw new Error("Country name must be 100 characters or less");
    }

    // Validate ISO codes format
    const codeRegex = /^[A-Z]{2}$/;
    if (!codeRegex.test(data.code.trim().toUpperCase())) {
      throw new Error(
        "Country code must be a valid 2-letter ISO 3166-1 alpha-2 code"
      );
    }

    const alpha3Regex = /^[A-Z]{3}$/;
    if (!alpha3Regex.test(data.alpha3.trim().toUpperCase())) {
      throw new Error(
        "Country alpha-3 code must be a valid 3-letter ISO 3166-1 alpha-3 code"
      );
    }

    // Validate numeric code if provided
    if (data.numericCode) {
      const numericRegex = /^\d{3}$/;
      if (!numericRegex.test(data.numericCode.trim())) {
        throw new Error(
          "Country numeric code must be a valid 3-digit ISO 3166-1 numeric code"
        );
      }
    }

    // Validate phone code if provided
    if (data.phoneCode) {
      const phoneCodeRegex = /^\+\d{1,4}$/;
      if (!phoneCodeRegex.test(data.phoneCode.trim())) {
        throw new Error("Phone code must be in format +X or +XXX or +XXXX");
      }
    }

    // Currency validation is handled by foreign key constraints in the database
  }

  /**
   * Validates country update data
   */
  public static validateUpdateData(data: UpdateCountryData): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error("Country name is required");
      }

      if (data.name.trim().length > 100) {
        throw new Error("Country name must be 100 characters or less");
      }
    }

    if (data.code !== undefined) {
      if (!data.code || data.code.trim().length === 0) {
        throw new Error("Country ISO code is required");
      }

      const codeRegex = /^[A-Z]{2}$/;
      if (!codeRegex.test(data.code.trim().toUpperCase())) {
        throw new Error(
          "Country code must be a valid 2-letter ISO 3166-1 alpha-2 code"
        );
      }
    }

    if (data.alpha3 !== undefined) {
      if (!data.alpha3 || data.alpha3.trim().length === 0) {
        throw new Error("Country alpha-3 code is required");
      }

      const alpha3Regex = /^[A-Z]{3}$/;
      if (!alpha3Regex.test(data.alpha3.trim().toUpperCase())) {
        throw new Error(
          "Country alpha-3 code must be a valid 3-letter ISO 3166-1 alpha-3 code"
        );
      }
    }

    if (data.numericCode !== undefined && data.numericCode) {
      const numericRegex = /^\d{3}$/;
      if (!numericRegex.test(data.numericCode.trim())) {
        throw new Error(
          "Country numeric code must be a valid 3-digit ISO 3166-1 numeric code"
        );
      }
    }

    if (data.phoneCode !== undefined && data.phoneCode) {
      const phoneCodeRegex = /^\+\d{1,4}$/;
      if (!phoneCodeRegex.test(data.phoneCode.trim())) {
        throw new Error("Phone code must be in format +X or +XXX or +XXXX");
      }
    }

    // Currency validation is handled by foreign key constraints in the database
  }

  /**
   * Normalizes country data for storage
   */
  public static normalizeData(
    data: CreateCountryData | UpdateCountryData
  ): any {
    const normalized: any = {};

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
  public static fromPrisma(data: any): Country {
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
