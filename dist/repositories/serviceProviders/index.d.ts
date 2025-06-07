/**
 * ServiceProvider Repository Implementation
 */
import { PrismaClient } from "@prisma/client";
import { IServiceProviderRepository, IServiceProvider, CreateServiceProviderData, UpdateServiceProviderData, ServiceProviderQueryOptions } from "../../types/serviceProviders";
import { ICountry } from "../../types/countries";
export declare class PrismaServiceProviderRepository implements IServiceProviderRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateServiceProviderData): Promise<IServiceProvider>;
    findById(id: string, includeCountries?: boolean): Promise<IServiceProvider | null>;
    findMany(options?: ServiceProviderQueryOptions): Promise<{
        serviceProviders: IServiceProvider[];
        total: number;
    }>;
    update(id: string, data: UpdateServiceProviderData): Promise<IServiceProvider>;
    delete(id: string): Promise<void>;
    existsByName(name: string, excludeId?: string): Promise<boolean>;
    addSupportedCountries(serviceProviderId: string, countryIds: string[]): Promise<void>;
    removeSupportedCountries(serviceProviderId: string, countryIds: string[]): Promise<void>;
    getSupportedCountries(serviceProviderId: string): Promise<ICountry[]>;
}
/**
 * Factory function to create ServiceProvider repository
 */
export declare function createServiceProviderRepository(prisma: PrismaClient): IServiceProviderRepository;
//# sourceMappingURL=index.d.ts.map