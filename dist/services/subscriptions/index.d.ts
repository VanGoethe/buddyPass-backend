/**
 * Subscription Service Implementation
 */
import { ISubscriptionService, ISlotAssignmentService, ISubscriptionRepository, ISubscriptionSlotRepository, ISubscriptionRequestRepository, CreateSubscriptionData, UpdateSubscriptionData, SubscriptionQueryOptions, SubscriptionResponse, SubscriptionListResponse, CreateSubscriptionRequestData, SubscriptionRequestResponse, SubscriptionSlotResponse, ISubscriptionSlot } from "../../types/subscriptions";
import { IServiceProviderRepository } from "../../types/serviceProviders";
import { ICountryRepository } from "../../types/countries";
export declare class SubscriptionService implements ISubscriptionService {
    private subscriptionRepository;
    private subscriptionSlotRepository;
    private subscriptionRequestRepository;
    private serviceProviderRepository;
    private countryRepository;
    private slotAssignmentService;
    constructor(subscriptionRepository: ISubscriptionRepository, subscriptionSlotRepository: ISubscriptionSlotRepository, subscriptionRequestRepository: ISubscriptionRequestRepository, serviceProviderRepository: IServiceProviderRepository, countryRepository: ICountryRepository, slotAssignmentService: ISlotAssignmentService);
    createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResponse>;
    getSubscriptionById(id: string): Promise<SubscriptionResponse>;
    getSubscriptions(options?: SubscriptionQueryOptions): Promise<SubscriptionListResponse>;
    updateSubscription(id: string, data: UpdateSubscriptionData): Promise<SubscriptionResponse>;
    deleteSubscription(id: string): Promise<void>;
    getSubscriptionsByServiceProvider(serviceProviderId: string): Promise<SubscriptionResponse[]>;
    requestSubscriptionSlot(userId: string, data: CreateSubscriptionRequestData): Promise<SubscriptionRequestResponse>;
    getUserSubscriptionSlots(userId: string): Promise<SubscriptionSlotResponse[]>;
}
export declare class SlotAssignmentService implements ISlotAssignmentService {
    private subscriptionRepository;
    private subscriptionSlotRepository;
    constructor(subscriptionRepository: ISubscriptionRepository, subscriptionSlotRepository: ISubscriptionSlotRepository);
    assignSlotToUser(userId: string, serviceProviderId: string, countryId?: string): Promise<{
        success: boolean;
        slotAssignment?: ISubscriptionSlot;
        message: string;
    }>;
    findAvailableSlot(serviceProviderId: string, countryId?: string): Promise<any | null>;
    validateSlotAssignment(subscriptionId: string): Promise<boolean>;
}
/**
 * Factory function to create Subscription service
 */
export declare function createSubscriptionService(subscriptionRepository: ISubscriptionRepository, subscriptionSlotRepository: ISubscriptionSlotRepository, subscriptionRequestRepository: ISubscriptionRequestRepository, serviceProviderRepository: IServiceProviderRepository, countryRepository: ICountryRepository, slotAssignmentService: ISlotAssignmentService): ISubscriptionService;
//# sourceMappingURL=index.d.ts.map