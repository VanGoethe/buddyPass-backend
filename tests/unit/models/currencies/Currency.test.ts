/**
 * Currency Model Unit Tests
 */

import { Currency } from "../../../../src/models/currencies";
import {
  CreateCurrencyData,
  UpdateCurrencyData,
} from "../../../../src/types/currencies";

describe("Currency Model", () => {
  const validCurrencyData = {
    id: "clh1234567890",
    name: "US Dollar",
    code: "USD",
    symbol: "$",
    minorUnit: 2,
    isActive: true,
    createdAt: new Date("2025-06-21T20:04:48.000Z"),
    updatedAt: new Date("2025-06-21T20:04:48.000Z"),
  };

  const validCreateData: CreateCurrencyData = {
    name: "US Dollar",
    code: "USD",
    symbol: "$",
    minorUnit: 2,
    isActive: true,
  };

  describe("Constructor", () => {
    it("should create a Currency instance with valid data", () => {
      const currency = new Currency(validCurrencyData);

      expect(currency.id).toBe(validCurrencyData.id);
      expect(currency.name).toBe(validCurrencyData.name);
      expect(currency.code).toBe(validCurrencyData.code);
      expect(currency.symbol).toBe(validCurrencyData.symbol);
      expect(currency.minorUnit).toBe(validCurrencyData.minorUnit);
      expect(currency.isActive).toBe(validCurrencyData.isActive);
      expect(currency.createdAt).toBe(validCurrencyData.createdAt);
      expect(currency.updatedAt).toBe(validCurrencyData.updatedAt);
    });

    it("should create a Currency instance with null symbol", () => {
      const currencyData = {
        ...validCurrencyData,
        symbol: null,
      };
      const currency = new Currency(currencyData);

      expect(currency.symbol).toBeNull();
    });
  });

  describe("validateCreateData", () => {
    it("should validate correct create data", () => {
      expect(() => Currency.validateCreateData(validCreateData)).not.toThrow();
    });

    it("should throw error for missing name", () => {
      const invalidData = { ...validCreateData, name: "" };
      expect(() => Currency.validateCreateData(invalidData)).toThrow(
        "Currency name is required"
      );
    });

    it("should throw error for missing code", () => {
      const invalidData = { ...validCreateData, code: "" };
      expect(() => Currency.validateCreateData(invalidData)).toThrow(
        "Currency code is required"
      );
    });

    it("should throw error for name too long", () => {
      const invalidData = { ...validCreateData, name: "a".repeat(101) };
      expect(() => Currency.validateCreateData(invalidData)).toThrow(
        "Currency name must be 100 characters or less"
      );
    });

    it("should throw error for invalid code format", () => {
      const invalidData = { ...validCreateData, code: "US" };
      expect(() => Currency.validateCreateData(invalidData)).toThrow(
        "Currency code must be a valid 3-letter ISO 4217 code"
      );
    });

    it("should throw error for symbol too long", () => {
      const invalidData = { ...validCreateData, symbol: "SYMBOL" };
      expect(() => Currency.validateCreateData(invalidData)).toThrow(
        "Currency symbol must be 5 characters or less"
      );
    });

    it("should throw error for invalid minor unit", () => {
      const invalidData = { ...validCreateData, minorUnit: 7 };
      expect(() => Currency.validateCreateData(invalidData)).toThrow(
        "Minor unit must be between 0 and 6"
      );
    });

    it("should throw error for negative minor unit", () => {
      const invalidData = { ...validCreateData, minorUnit: -1 };
      expect(() => Currency.validateCreateData(invalidData)).toThrow(
        "Minor unit must be between 0 and 6"
      );
    });
  });

  describe("validateUpdateData", () => {
    const validUpdateData: UpdateCurrencyData = {
      name: "US Dollar (Updated)",
      symbol: "$",
      isActive: true,
    };

    it("should validate correct update data", () => {
      expect(() => Currency.validateUpdateData(validUpdateData)).not.toThrow();
    });

    it("should validate empty update data", () => {
      expect(() => Currency.validateUpdateData({})).not.toThrow();
    });

    it("should throw error for empty name when provided", () => {
      const invalidData = { ...validUpdateData, name: "" };
      expect(() => Currency.validateUpdateData(invalidData)).toThrow(
        "Currency name is required"
      );
    });

    it("should throw error for invalid code format when provided", () => {
      const invalidData = { ...validUpdateData, code: "US" };
      expect(() => Currency.validateUpdateData(invalidData)).toThrow(
        "Currency code must be a valid 3-letter ISO 4217 code"
      );
    });
  });

  describe("normalizeData", () => {
    it("should normalize create data correctly", () => {
      const data = {
        name: "  us dollar  ",
        code: "usd",
        symbol: " $ ",
        minorUnit: 2,
        isActive: true,
      };

      const normalized = Currency.normalizeData(data);

      expect(normalized.name).toBe("us dollar");
      expect(normalized.code).toBe("USD");
      expect(normalized.symbol).toBe("$");
      expect(normalized.minorUnit).toBe(2);
      expect(normalized.isActive).toBe(true);
    });

    it("should handle null values correctly", () => {
      const data = {
        name: "US Dollar",
        code: "USD",
        symbol: "",
        minorUnit: undefined,
        isActive: true,
      };

      const normalized = Currency.normalizeData(data);

      expect(normalized.name).toBe("US Dollar");
      expect(normalized.code).toBe("USD");
      expect(normalized.symbol).toBeNull();
      expect(normalized.minorUnit).toBe(2); // Default value
      expect(normalized.isActive).toBe(true);
    });
  });

  describe("toResponse", () => {
    it("should convert to response format correctly", () => {
      const currency = new Currency(validCurrencyData);
      const response = currency.toResponse();

      expect(response.id).toBe(validCurrencyData.id);
      expect(response.name).toBe(validCurrencyData.name);
      expect(response.code).toBe(validCurrencyData.code);
      expect(response.symbol).toBe(validCurrencyData.symbol);
      expect(response.minorUnit).toBe(validCurrencyData.minorUnit);
      expect(response.isActive).toBe(validCurrencyData.isActive);
      expect(response.createdAt).toBe(
        validCurrencyData.createdAt.toISOString()
      );
      expect(response.updatedAt).toBe(
        validCurrencyData.updatedAt.toISOString()
      );
    });
  });

  describe("fromPrisma", () => {
    it("should create Currency instance from Prisma data", () => {
      const prismaData = {
        id: "clh1234567890",
        name: "US Dollar",
        code: "USD",
        symbol: "$",
        minorUnit: 2,
        isActive: true,
        createdAt: new Date("2025-06-21T20:04:48.000Z"),
        updatedAt: new Date("2025-06-21T20:04:48.000Z"),
      };

      const currency = Currency.fromPrisma(prismaData);

      expect(currency).toBeInstanceOf(Currency);
      expect(currency.id).toBe(prismaData.id);
      expect(currency.name).toBe(prismaData.name);
      expect(currency.code).toBe(prismaData.code);
      expect(currency.symbol).toBe(prismaData.symbol);
      expect(currency.minorUnit).toBe(prismaData.minorUnit);
      expect(currency.isActive).toBe(prismaData.isActive);
      expect(currency.createdAt).toBe(prismaData.createdAt);
      expect(currency.updatedAt).toBe(prismaData.updatedAt);
    });
  });
});
