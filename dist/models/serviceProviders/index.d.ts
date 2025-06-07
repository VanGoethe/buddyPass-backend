/**
 * ServiceProvider Domain Model
 */
import { Prisma } from "@prisma/client";
import { IServiceProvider, CreateServiceProviderData, ServiceProviderResponse } from "../../types/serviceProviders";
import { ICountry } from "../../types/countries";
export declare class ServiceProvider implements IServiceProvider {
    readonly id: string;
    readonly name: string;
    readonly description?: string | null;
    readonly metadata?: Prisma.JsonValue | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly supportedCountries?: {
        country: ICountry;
    }[];
    constructor(data: IServiceProvider);
    /**
     * Validates service provider creation data
     */
    static validateCreateData(data: CreateServiceProviderData): void;
    /**
     * Validates service provider update data
     */
    static validateUpdateData(data: any): void;
    /**
     * Converts domain model to API response format
     */
    toResponse(): ServiceProviderResponse;
    /**
     * Creates a ServiceProvider instance from Prisma result
     */
    static fromPrisma(data: any): ServiceProvider;
}
//# sourceMappingURL=index.d.ts.map