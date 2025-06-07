/**
 * Country Controller
 */

import { Request, Response } from "express";
import { ICountryService, CountryQueryOptions } from "../../types/countries";

export class CountryController {
  constructor(private countryService: ICountryService) {}

  /**
   * Create a new country
   */
  async createCountry(req: Request, res: Response): Promise<void> {
    try {
      const countryData = req.body;
      const country = await this.countryService.createCountry(countryData);

      res.status(201).json({
        success: true,
        data: country,
        message: "Country created successfully",
      });
    } catch (error) {
      console.error("Create country error:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "COUNTRY_CREATION_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to create country",
        },
      });
    }
  }

  /**
   * Get country by ID
   */
  async getCountryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const country = await this.countryService.getCountryById(id);

      res.status(200).json({
        success: true,
        data: country,
      });
    } catch (error) {
      console.error("Get country by ID error:", error);

      if (error instanceof Error && error.message === "Country not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "COUNTRY_NOT_FOUND",
            message: "Country not found",
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "COUNTRY_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve country",
        },
      });
    }
  }

  /**
   * Get country by code
   */
  async getCountryByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const country = await this.countryService.getCountryByCode(code);

      res.status(200).json({
        success: true,
        data: country,
      });
    } catch (error) {
      console.error("Get country by code error:", error);

      if (error instanceof Error && error.message === "Country not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "COUNTRY_NOT_FOUND",
            message: "Country not found",
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "COUNTRY_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve country",
        },
      });
    }
  }

  /**
   * Get all countries with pagination and filtering
   */
  async getCountries(req: Request, res: Response): Promise<void> {
    try {
      const options: CountryQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        sortBy: req.query.sortBy as "name" | "code" | "createdAt" | "updatedAt",
        sortOrder: req.query.sortOrder as "asc" | "desc",
        search: req.query.search as string,
        continent: req.query.continent as string,
        region: req.query.region as string,
        isActive:
          req.query.isActive === "true"
            ? true
            : req.query.isActive === "false"
            ? false
            : undefined,
      };

      const result = await this.countryService.getCountries(options);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get countries error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "COUNTRIES_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve countries",
        },
      });
    }
  }

  /**
   * Get active countries
   */
  async getActiveCountries(req: Request, res: Response): Promise<void> {
    try {
      const countries = await this.countryService.getActiveCountries();

      res.status(200).json({
        success: true,
        data: countries,
      });
    } catch (error) {
      console.error("Get active countries error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "ACTIVE_COUNTRIES_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve active countries",
        },
      });
    }
  }

  /**
   * Update country
   */
  async updateCountry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedCountry = await this.countryService.updateCountry(
        id,
        updateData
      );

      res.status(200).json({
        success: true,
        data: updatedCountry,
        message: "Country updated successfully",
      });
    } catch (error) {
      console.error("Update country error:", error);

      if (error instanceof Error && error.message === "Country not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "COUNTRY_NOT_FOUND",
            message: "Country not found",
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: {
          code: "COUNTRY_UPDATE_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to update country",
        },
      });
    }
  }

  /**
   * Delete country
   */
  async deleteCountry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.countryService.deleteCountry(id);

      res.status(200).json({
        success: true,
        message: "Country deleted successfully",
      });
    } catch (error) {
      console.error("Delete country error:", error);

      if (error instanceof Error && error.message === "Country not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "COUNTRY_NOT_FOUND",
            message: "Country not found",
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes("being used by")) {
        res.status(409).json({
          success: false,
          error: {
            code: "COUNTRY_IN_USE",
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "COUNTRY_DELETION_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to delete country",
        },
      });
    }
  }
}

// Export a factory function to create controller instance
export const createCountryController = (
  countryService: ICountryService
): CountryController => {
  return new CountryController(countryService);
};
