/**
 * Currency Controller
 */
import { Request, Response } from "express";
import { ICurrencyService } from "../../types/currencies";
export declare class CurrencyController {
    private currencyService;
    constructor(currencyService: ICurrencyService);
    /**
     * Create a new currency
     */
    createCurrency(req: Request, res: Response): Promise<void>;
    /**
     * Get currency by ID
     */
    getCurrencyById(req: Request, res: Response): Promise<void>;
    /**
     * Get currency by code
     */
    getCurrencyByCode(req: Request, res: Response): Promise<void>;
    /**
     * Get all currencies with pagination and filtering
     */
    getCurrencies(req: Request, res: Response): Promise<void>;
    /**
     * Get active currencies
     */
    getActiveCurrencies(req: Request, res: Response): Promise<void>;
    /**
     * Update currency
     */
    updateCurrency(req: Request, res: Response): Promise<void>;
    /**
     * Delete currency
     */
    deleteCurrency(req: Request, res: Response): Promise<void>;
}
export declare const createCurrencyController: (currencyService: ICurrencyService) => CurrencyController;
//# sourceMappingURL=index.d.ts.map