/**
 * Subscription Service Implementation
 */
import { ISubscriptionService, ISubscriptionRepository, CreateSubscriptionData, UpdateSubscriptionData, SubscriptionResponse, SubscriptionListResponse, SubscriptionQueryOptions } from "../../types/subscriptions";
import { IServiceProviderRepository } from "../../types/serviceProviders";
import { ICountryRepository } from "../../types/countries";
export declare class SubscriptionService implements ISubscriptionService {
    private subscriptionRepository;
    private serviceProviderRepository;
    private countryRepository;
    constructor(subscriptionRepository: ISubscriptionRepository, serviceProviderRepository: IServiceProviderRepository, countryRepository: ICountryRepository);
    createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResponse>;
    getSubscriptionById(id: string): Promise<SubscriptionResponse>;
    getSubscriptions(options?: SubscriptionQueryOptions): Promise<SubscriptionListResponse>;
    updateSubscription(id: string, data: UpdateSubscriptionData): Promise<SubscriptionResponse>;
    deleteSubscription(id: string): Promise<void>;
    getSubscriptionsByServiceProvider(serviceProviderId: string): Promise<SubscriptionResponse[]>;
    /**
     * Validates that the country is supported by the service provider
     */
    private validateCountryForServiceProvider;
}
/**
 * Factory function to create Subscription service
 */
export declare function createSubscriptionService(subscriptionRepository: ISubscriptionRepository, serviceProviderRepository: IServiceProviderRepository, countryRepository: ICountryRepository): ISubscriptionService;
//# sourceMappingURL=index.d.ts.map