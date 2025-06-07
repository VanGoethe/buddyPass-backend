import { PrismaClient } from "@prisma/client";
/**
 * Base service class with common functionality
 */
export declare abstract class BaseService {
    protected prisma: PrismaClient;
    constructor();
    /**
     * Handle service errors consistently
     */
    protected handleError(error: any, operation: string): never;
    /**
     * Validate required fields
     */
    protected validateRequiredFields(data: any, requiredFields: string[]): void;
}
/**
 * Service exports
 * Centralized exports for all service layers
 */
export { UserService } from "./users";
export type { IUserService } from "../types/users";
export { SubscriptionService } from "./subscriptions";
export type { ISubscriptionService } from "../types/subscriptions";
export { ServiceProviderService } from "./serviceProviders";
export type { IServiceProviderService } from "../types/serviceProviders";
//# sourceMappingURL=index.d.ts.map