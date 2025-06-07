/**
 * Country Controller
 */
import { Request, Response } from "express";
import { ICountryService } from "../../types/countries";
export declare class CountryController {
    private countryService;
    constructor(countryService: ICountryService);
    /**
     * Create a new country
     */
    createCountry(req: Request, res: Response): Promise<void>;
    /**
     * Get country by ID
     */
    getCountryById(req: Request, res: Response): Promise<void>;
    /**
     * Get country by code
     */
    getCountryByCode(req: Request, res: Response): Promise<void>;
    /**
     * Get all countries with pagination and filtering
     */
    getCountries(req: Request, res: Response): Promise<void>;
    /**
     * Get active countries
     */
    getActiveCountries(req: Request, res: Response): Promise<void>;
    /**
     * Update country
     */
    updateCountry(req: Request, res: Response): Promise<void>;
    /**
     * Delete country
     */
    deleteCountry(req: Request, res: Response): Promise<void>;
}
export declare const createCountryController: (countryService: ICountryService) => CountryController;
//# sourceMappingURL=index.d.ts.map