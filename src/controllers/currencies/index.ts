/**
 * Currency Controller
 */

import { Request, Response } from "express";
import { ICurrencyService, CurrencyQueryOptions } from "../../types/currencies";

export class CurrencyController {
  constructor(private currencyService: ICurrencyService) {}

  /**
   * Create a new currency
   */
  async createCurrency(req: Request, res: Response): Promise<void> {
    try {
      const currencyData = req.body;
      const currency = await this.currencyService.createCurrency(currencyData);

      res.status(201).json({
        success: true,
        data: currency,
        message: "Currency created successfully",
      });
    } catch (error) {
      console.error("Create currency error:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "CURRENCY_CREATION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create currency",
        },
      });
    }
  }

  /**
   * Get currency by ID
   */
  async getCurrencyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currency = await this.currencyService.getCurrencyById(id);

      res.status(200).json({
        success: true,
        data: currency,
      });
    } catch (error) {
      console.error("Get currency by ID error:", error);

      if (error instanceof Error && error.message === "Currency not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "CURRENCY_NOT_FOUND",
            message: "Currency not found",
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "CURRENCY_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve currency",
        },
      });
    }
  }

  /**
   * Get currency by code
   */
  async getCurrencyByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const currency = await this.currencyService.getCurrencyByCode(code);

      res.status(200).json({
        success: true,
        data: currency,
      });
    } catch (error) {
      console.error("Get currency by code error:", error);

      if (error instanceof Error && error.message === "Currency not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "CURRENCY_NOT_FOUND",
            message: "Currency not found",
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "CURRENCY_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve currency",
        },
      });
    }
  }

  /**
   * Get all currencies with pagination and filtering
   */
  async getCurrencies(req: Request, res: Response): Promise<void> {
    try {
      const options: CurrencyQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        sortBy: req.query.sortBy as "name" | "code" | "createdAt" | "updatedAt",
        sortOrder: req.query.sortOrder as "asc" | "desc",
        search: req.query.search as string,
        isActive:
          req.query.isActive === "true"
            ? true
            : req.query.isActive === "false"
            ? false
            : undefined,
      };

      const result = await this.currencyService.getCurrencies(options);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get currencies error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CURRENCIES_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve currencies",
        },
      });
    }
  }

  /**
   * Get active currencies
   */
  async getActiveCurrencies(req: Request, res: Response): Promise<void> {
    try {
      const currencies = await this.currencyService.getActiveCurrencies();

      res.status(200).json({
        success: true,
        data: currencies,
      });
    } catch (error) {
      console.error("Get active currencies error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "ACTIVE_CURRENCIES_RETRIEVAL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve active currencies",
        },
      });
    }
  }

  /**
   * Update currency
   */
  async updateCurrency(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedCurrency = await this.currencyService.updateCurrency(
        id,
        updateData
      );

      res.status(200).json({
        success: true,
        data: updatedCurrency,
        message: "Currency updated successfully",
      });
    } catch (error) {
      console.error("Update currency error:", error);

      if (error instanceof Error && error.message === "Currency not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "CURRENCY_NOT_FOUND",
            message: "Currency not found",
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: {
          code: "CURRENCY_UPDATE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update currency",
        },
      });
    }
  }

  /**
   * Delete currency
   */
  async deleteCurrency(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.currencyService.deleteCurrency(id);

      res.status(200).json({
        success: true,
        message: "Currency deleted successfully",
      });
    } catch (error) {
      console.error("Delete currency error:", error);

      if (error instanceof Error && error.message === "Currency not found") {
        res.status(404).json({
          success: false,
          error: {
            code: "CURRENCY_NOT_FOUND",
            message: "Currency not found",
          },
        });
        return;
      }

      if (
        error instanceof Error &&
        error.message.includes("Cannot delete currency that is being used")
      ) {
        res.status(409).json({
          success: false,
          error: {
            code: "CURRENCY_IN_USE",
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: "CURRENCY_DELETION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete currency",
        },
      });
    }
  }
}

// Export a factory function to create controller instance
export const createCurrencyController = (
  currencyService: ICurrencyService
): CurrencyController => {
  return new CurrencyController(currencyService);
};
