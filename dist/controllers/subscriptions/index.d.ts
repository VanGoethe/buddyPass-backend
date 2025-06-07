/**
 * Subscription Controller Implementation
 */
import { Request, Response } from "express";
import { ISubscriptionService } from "../../types/subscriptions";
export declare class SubscriptionController {
    private subscriptionService;
    constructor(subscriptionService: ISubscriptionService);
    /**
     * Validation rules for creating a subscription
     */
    static createValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for updating a subscription
     */
    static updateValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for getting subscriptions
     */
    static getListValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for getting a single subscription
     */
    static getByIdValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for deleting a subscription
     */
    static deleteValidation: import("express-validator").ValidationChain[];
    /**
     * Validation rules for getting subscriptions by service provider
     */
    static getByServiceProviderValidation: import("express-validator").ValidationChain[];
    /**
     * Create a new subscription
     */
    createSubscription(req: Request, res: Response): Promise<void>;
    /**
     * Get a subscription by ID
     */
    getSubscriptionById(req: Request, res: Response): Promise<void>;
    /**
     * Get list of subscriptions with pagination and filtering
     */
    getSubscriptions(req: Request, res: Response): Promise<void>;
    /**
     * Update a subscription
     */
    updateSubscription(req: Request, res: Response): Promise<void>;
    /**
     * Delete a subscription
     */
    deleteSubscription(req: Request, res: Response): Promise<void>;
    /**
     * Get subscriptions by service provider
     */
    getSubscriptionsByServiceProvider(req: Request, res: Response): Promise<void>;
}
/**
 * Factory function to create Subscription controller
 */
export declare function createSubscriptionController(subscriptionService: ISubscriptionService): SubscriptionController;
//# sourceMappingURL=index.d.ts.map