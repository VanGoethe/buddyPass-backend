/**
 * Subscription Repository Implementation
 */
import { PrismaClient } from "@prisma/client";
import { ISubscriptionRepository, ISubscription, CreateSubscriptionData, UpdateSubscriptionData, SubscriptionQueryOptions } from "../../types/subscriptions";
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
}
/**
 * Factory function to create Subscription repository
 */
export declare function createSubscriptionRepository(prisma: PrismaClient): ISubscriptionRepository;
//# sourceMappingURL=index.d.ts.map