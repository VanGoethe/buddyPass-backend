/**
 * ServiceProvider Controller Implementation
 */
import { Request, Response } from "express";
import { IServiceProviderService } from "../../types/serviceProviders";
export declare class ServiceProviderController {
    private serviceProviderService;
    constructor(serviceProviderService: IServiceProviderService);
    /**
     * Validation rules for creating a service provider
     */
    static createValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for updating a service provider
     */
    static updateValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for getting service providers
     */
    static getListValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for getting a single service provider
     */
    static getByIdValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for deleting a service provider
     */
    static deleteValidation: import("express-validator").ValidationChain[];
    /**
     * Create a new service provider
     */
    createServiceProvider(req: Request, res: Response): Promise<void>;
    /**
     * Get a service provider by ID
     */
    getServiceProviderById(req: Request, res: Response): Promise<void>;
    /**
     * Get list of service providers with pagination
     */
    getServiceProviders(req: Request, res: Response): Promise<void>;
    /**
     * Update a service provider
     */
    updateServiceProvider(req: Request, res: Response): Promise<void>;
    /**
     * Delete a service provider
     */
    deleteServiceProvider(req: Request, res: Response): Promise<void>;
}
/**
 * Factory function to create ServiceProvider controller
 */
export declare function createServiceProviderController(serviceProviderService: IServiceProviderService): ServiceProviderController;
//# sourceMappingURL=index.d.ts.map