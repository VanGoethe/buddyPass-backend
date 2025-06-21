/**
 * Subscription Repository Implementation
 */
import { PrismaClient } from "@prisma/client";
import { ISubscriptionRepository, ISubscriptionSlotRepository, ISubscriptionRequestRepository, ISubscription, ISubscriptionSlot, ISubscriptionRequest, CreateSubscriptionData, UpdateSubscriptionData, SubscriptionQueryOptions, CreateSubscriptionRequestData, SubscriptionRequestStatus } from "../../types/subscriptions";
export declare class PrismaSubscriptionRepository implements ISubscriptionRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateSubscriptionData & {
        passwordHash: string;
    }): Promise<ISubscription>;
    findById(id: string, includeCountry?: boolean): Promise<ISubscription | null>;
    findMany(options?: SubscriptionQueryOptions): Promise<{
        subscriptions: ISubscription[];
        total: number;
    }>;
    update(id: string, data: UpdateSubscriptionData & {
        passwordHash?: string;
    }): Promise<ISubscription>;
    delete(id: string): Promise<void>;
    existsByEmail(email: string, excludeId?: string): Promise<boolean>;
    findByServiceProviderId(serviceProviderId: string): Promise<ISubscription[]>;
    countByServiceProviderId(serviceProviderId: string): Promise<number>;
    findAvailableByServiceProviderId(serviceProviderId: string, countryId?: string): Promise<ISubscription[]>;
    decrementAvailableSlots(subscriptionId: string): Promise<ISubscription>;
}
export declare class PrismaSubscriptionSlotRepository implements ISubscriptionSlotRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: {
        userId: string;
        subscriptionId: string;
    }): Promise<ISubscriptionSlot>;
    findByUserId(userId: string): Promise<ISubscriptionSlot[]>;
    findBySubscriptionId(subscriptionId: string): Promise<ISubscriptionSlot[]>;
    findByUserAndSubscription(userId: string, subscriptionId: string): Promise<ISubscriptionSlot | null>;
    findByUserAndServiceProvider(userId: string, serviceProviderId: string): Promise<ISubscriptionSlot | null>;
    countBySubscriptionId(subscriptionId: string): Promise<number>;
    delete(id: string): Promise<void>;
    deleteByUserAndSubscription(userId: string, subscriptionId: string): Promise<void>;
}
export declare class PrismaSubscriptionRequestRepository implements ISubscriptionRequestRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateSubscriptionRequestData & {
        userId: string;
    }): Promise<ISubscriptionRequest>;
    findById(id: string): Promise<ISubscriptionRequest | null>;
    findByUserId(userId: string): Promise<ISubscriptionRequest[]>;
    findPendingRequests(): Promise<ISubscriptionRequest[]>;
    findPendingByServiceProvider(serviceProviderId: string): Promise<ISubscriptionRequest[]>;
    updateStatus(id: string, status: SubscriptionRequestStatus): Promise<ISubscriptionRequest>;
    update(id: string, data: {
        status?: SubscriptionRequestStatus;
        assignedSlotId?: string | null;
        processedAt?: Date;
        metadata?: any;
    }): Promise<ISubscriptionRequest>;
    delete(id: string): Promise<void>;
}
/**
 * Factory function to create Subscription repository
 */
export declare function createSubscriptionRepository(prisma: PrismaClient): ISubscriptionRepository;
//# sourceMappingURL=index.d.ts.map