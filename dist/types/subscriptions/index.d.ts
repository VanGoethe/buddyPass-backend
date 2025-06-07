/**
 * Subscription Type Definitions
 */
import { Prisma } from "@prisma/client";
import { ICountry } from "../countries";
export interface ISubscription {
    id: string;
    serviceProviderId: string;
    countryId?: string | null;
    name: string;
    email: string;
    passwordHash: string;
    availableSlots: number;
    expiresAt?: Date | null;
    renewalInfo?: Prisma.JsonValue | null;
    userPrice?: Prisma.Decimal | null;
    currency?: string | null;
    metadata?: Prisma.JsonValue | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    country?: ICountry | null;
}
export interface CreateSubscriptionData {
    serviceProviderId: string;
    countryId?: string;
    name: string;
    email: string;
    password: string;
    availableSlots: number;
    expiresAt?: Date;
    renewalInfo?: Prisma.JsonValue;
    userPrice?: number;
    currency?: string;
    metadata?: Prisma.JsonValue;
    isActive?: boolean;
}
export interface UpdateSubscriptionData {
    name?: string;
    email?: string;
    password?: string;
    availableSlots?: number;
    countryId?: string;
    expiresAt?: Date;
    renewalInfo?: Prisma.JsonValue;
    userPrice?: number;
    currency?: string;
    metadata?: Prisma.JsonValue;
    isActive?: boolean;
}
export interface SubscriptionResponse {
    id: string;
    serviceProviderId: string;
    countryId?: string | null;
    name: string;
    email: string;
    availableSlots: number;
    country?: {
        id: string;
        name: string;
        code: string;
        alpha3: string;
    } | null;
    expiresAt?: string | null;
    renewalInfo?: Prisma.JsonValue | null;
    userPrice?: string | null;
    currency?: string | null;
    metadata?: Prisma.JsonValue | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface SubscriptionListResponse {
    subscriptions: SubscriptionResponse[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
export interface SubscriptionQueryOptions {
    page?: number;
    limit?: number;
    sortBy?: "name" | "email" | "availableSlots" | "expiresAt" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
    search?: string;
    serviceProviderId?: string;
    isActive?: boolean;
    countryId?: string;
}
export interface ISubscriptionRepository {
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
export interface ISubscriptionService {
    createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResponse>;
    getSubscriptionById(id: string): Promise<SubscriptionResponse>;
    getSubscriptions(options?: SubscriptionQueryOptions): Promise<SubscriptionListResponse>;
    updateSubscription(id: string, data: UpdateSubscriptionData): Promise<SubscriptionResponse>;
    deleteSubscription(id: string): Promise<void>;
    getSubscriptionsByServiceProvider(serviceProviderId: string): Promise<SubscriptionResponse[]>;
}
//# sourceMappingURL=index.d.ts.map