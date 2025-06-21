/**
 * Country Model Unit Tests
 */

import { Country } from "../../../../src/models/countries";
import {
  CreateCountryData,
  UpdateCountryData,
} from "../../../../src/types/countries";

describe("Country Model", () => {
  const validCountryData = {
    id: "clh1234567890",
    name: "United States",
    code: "US",
    alpha3: "USA",
    numericCode: "840",
    continent: "North America",
    region: "Northern America",
    currencyId: "cmc6lpjqw00009utlsvz3enyx",
    phoneCode: "+1",
    isActive: true,
    createdAt: new Date("2025-06-04T22:09:04.000Z"),
    updatedAt: new Date("2025-06-04T22:09:04.000Z"),
  };

  describe("Constructor", () => {
    it("should create a Country instance with valid data", () => {
      const country = new Country(validCountryData);

      expect(country.id).toBe(validCountryData.id);
      expect(country.name).toBe(validCountryData.name);
      expect(country.code).toBe(validCountryData.code);
      expect(country.alpha3).toBe(validCountryData.alpha3);
      expect(country.numericCode).toBe(validCountryData.numericCode);
      expect(country.continent).toBe(validCountryData.continent);
      expect(country.region).toBe(validCountryData.region);
      expect(country.currencyId).toBe(validCountryData.currencyId);
      expect(country.phoneCode).toBe(validCountryData.phoneCode);
      expect(country.isActive).toBe(validCountryData.isActive);
      expect(country.createdAt).toBe(validCountryData.createdAt);
      expect(country.updatedAt).toBe(validCountryData.updatedAt);
    });

    it("should handle nullable fields correctly", () => {
      const countryDataWithNulls = {
        ...validCountryData,
        numericCode: null,
        continent: null,
        region: null,
        currencyId: null,
        phoneCode: null,
      };

      const country = new Country(countryDataWithNulls);

      expect(country.numericCode).toBeNull();
      expect(country.continent).toBeNull();
      expect(country.region).toBeNull();
      expect(country.currencyId).toBeNull();
      expect(country.phoneCode).toBeNull();
    });
  });

  describe("validateCreateData", () => {
    const validCreateData: CreateCountryData = {
      name: "United States",
      code: "US",
      alpha3: "USA",
      numericCode: "840",
      continent: "North America",
      region: "Northern America",
      currencyId: "cmc6lpjqw00009utlsvz3enyx",
      phoneCode: "+1",
      isActive: true,
    };

    it("should validate correct data without throwing", () => {
      expect(() => Country.validateCreateData(validCreateData)).not.toThrow();
    });

    it("should throw error for missing name", () => {
      const invalidData = { ...validCreateData, name: "" };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Country name is required"
      );
    });

    it("should throw error for missing code", () => {
      const invalidData = { ...validCreateData, code: "" };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Country ISO code is required"
      );
    });

    it("should throw error for missing alpha3", () => {
      const invalidData = { ...validCreateData, alpha3: "" };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Country alpha-3 code is required"
      );
    });

    it("should throw error for name too long", () => {
      const invalidData = { ...validCreateData, name: "a".repeat(101) };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Country name must be 100 characters or less"
      );
    });

    it("should throw error for invalid code format", () => {
      const invalidData = { ...validCreateData, code: "USA" };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Country code must be a valid 2-letter ISO 3166-1 alpha-2 code"
      );
    });

    it("should throw error for invalid alpha3 format", () => {
      const invalidData = { ...validCreateData, alpha3: "US" };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Country alpha-3 code must be a valid 3-letter ISO 3166-1 alpha-3 code"
      );
    });

    it("should throw error for invalid numeric code format", () => {
      const invalidData = { ...validCreateData, numericCode: "84" };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Country numeric code must be a valid 3-digit ISO 3166-1 numeric code"
      );
    });

    it("should throw error for invalid phone code format", () => {
      const invalidData = { ...validCreateData, phoneCode: "1" };
      expect(() => Country.validateCreateData(invalidData)).toThrow(
        "Phone code must be in format +X or +XXX or +XXXX"
      );
    });

    // Currency validation is now handled by database foreign key constraints

    it("should accept valid optional fields", () => {
      const validDataWithOptionals = {
        ...validCreateData,
        numericCode: "840",
        phoneCode: "+1",
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
      };
      expect(() =>
        Country.validateCreateData(validDataWithOptionals)
      ).not.toThrow();
    });

    it("should accept undefined optional fields", () => {
      const validDataWithoutOptionals = {
        name: "United States",
        code: "US",
        alpha3: "USA",
      };
      expect(() =>
        Country.validateCreateData(validDataWithoutOptionals)
      ).not.toThrow();
    });
  });

  describe("validateUpdateData", () => {
    it("should validate correct update data without throwing", () => {
      const updateData: UpdateCountryData = {
        name: "United States of America",
        continent: "North America",
      };
      expect(() => Country.validateUpdateData(updateData)).not.toThrow();
    });

    it("should throw error for empty name in update", () => {
      const updateData: UpdateCountryData = { name: "" };
      expect(() => Country.validateUpdateData(updateData)).toThrow(
        "Country name is required"
      );
    });

    it("should throw error for invalid code in update", () => {
      const updateData: UpdateCountryData = { code: "USA" };
      expect(() => Country.validateUpdateData(updateData)).toThrow(
        "Country code must be a valid 2-letter ISO 3166-1 alpha-2 code"
      );
    });

    it("should accept empty update data", () => {
      const updateData: UpdateCountryData = {};
      expect(() => Country.validateUpdateData(updateData)).not.toThrow();
    });
  });

  describe("normalizeData", () => {
    it("should normalize create data correctly", () => {
      const createData: CreateCountryData = {
        name: "  United States  ",
        code: "us",
        alpha3: "usa",
        numericCode: "  840  ",
        continent: "  North America  ",
        region: "  Northern America  ",
        currencyId: "usd",
        phoneCode: "  +1  ",
        isActive: true,
      };

      const normalized = Country.normalizeData(createData);

      expect(normalized.name).toBe("United States");
      expect(normalized.code).toBe("US");
      expect(normalized.alpha3).toBe("USA");
      expect(normalized.numericCode).toBe("840");
      expect(normalized.continent).toBe("North America");
      expect(normalized.region).toBe("Northern America");
      expect(normalized.currencyId).toBe("usd");
      expect(normalized.phoneCode).toBe("+1");
      expect(normalized.isActive).toBe(true);
    });

    it("should handle null values correctly", () => {
      const createData: CreateCountryData = {
        name: "United States",
        code: "US",
        alpha3: "USA",
        numericCode: "",
        continent: "",
        region: "",
        currencyId: "",
        phoneCode: "",
      };

      const normalized = Country.normalizeData(createData);

      expect(normalized.numericCode).toBeNull();
      expect(normalized.continent).toBeNull();
      expect(normalized.region).toBeNull();
      expect(normalized.currencyId).toBeNull();
      expect(normalized.phoneCode).toBeNull();
    });
  });

  describe("toResponse", () => {
    it("should convert to response format correctly", () => {
      const country = new Country(validCountryData);
      const response = country.toResponse();

      expect(response.id).toBe(validCountryData.id);
      expect(response.name).toBe(validCountryData.name);
      expect(response.code).toBe(validCountryData.code);
      expect(response.alpha3).toBe(validCountryData.alpha3);
      expect(response.numericCode).toBe(validCountryData.numericCode);
      expect(response.continent).toBe(validCountryData.continent);
      expect(response.region).toBe(validCountryData.region);
      expect(response.currencyId).toBe(validCountryData.currencyId);
      expect(response.phoneCode).toBe(validCountryData.phoneCode);
      expect(response.isActive).toBe(validCountryData.isActive);
      expect(response.createdAt).toBe("2025-06-04T22:09:04.000Z");
      expect(response.updatedAt).toBe("2025-06-04T22:09:04.000Z");
    });
  });

  describe("fromPrisma", () => {
    it("should create Country instance from Prisma data", () => {
      const prismaData = {
        id: "clh1234567890",
        name: "United States",
        code: "US",
        alpha3: "USA",
        numericCode: "840",
        continent: "North America",
        region: "Northern America",
        currencyId: "cmc6lpjqw00009utlsvz3enyx",
        phoneCode: "+1",
        isActive: true,
        createdAt: new Date("2025-06-04T22:09:04.000Z"),
        updatedAt: new Date("2025-06-04T22:09:04.000Z"),
      };

      const country = Country.fromPrisma(prismaData);

      expect(country).toBeInstanceOf(Country);
      expect(country.id).toBe(prismaData.id);
      expect(country.name).toBe(prismaData.name);
      expect(country.code).toBe(prismaData.code);
      expect(country.alpha3).toBe(prismaData.alpha3);
      expect(country.isActive).toBe(prismaData.isActive);
    });
  });
});
