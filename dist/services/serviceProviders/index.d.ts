/**
 * ServiceProvider Service Implementation
 */
import { IServiceProviderService, IServiceProviderRepository, CreateServiceProviderData, UpdateServiceProviderData, ServiceProviderResponse, ServiceProviderListResponse, ServiceProviderQueryOptions } from "../../types/serviceProviders";
import { ICountryRepository } from "../../types/countries";
export declare class ServiceProviderService implements IServiceProviderService {
    private serviceProviderRepository;
    private countryRepository;
    constructor(serviceProviderRepository: IServiceProviderRepository, countryRepository: ICountryRepository);
    createServiceProvider(data: CreateServiceProviderData): Promise<ServiceProviderResponse>;
    getServiceProviderById(id: string): Promise<ServiceProviderResponse>;
    getServiceProviders(options?: ServiceProviderQueryOptions): Promise<ServiceProviderListResponse>;
    updateServiceProvider(id: string, data: UpdateServiceProviderData): Promise<ServiceProviderResponse>;
    deleteServiceProvider(id: string): Promise<void>;
    /**
     * Validates that all provided country IDs exist
     */
    private validateCountryIds;
}
/**
 * Factory function to create ServiceProvider service
 */
export declare function createServiceProviderService(serviceProviderRepository: IServiceProviderRepository, countryRepository: ICountryRepository): IServiceProviderService;
//# sourceMappingURL=index.d.ts.map