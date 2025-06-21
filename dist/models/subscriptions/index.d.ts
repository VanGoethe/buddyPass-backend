/**
 * Subscription Domain Model
 */
import { Prisma } from "@prisma/client";
import { ISubscription, ISubscriptionSlot, ISubscriptionRequest, CreateSubscriptionData, SubscriptionResponse, SubscriptionSlotResponse, SubscriptionRequestResponse, SubscriptionRequestStatus } from "../../types/subscriptions";
import { ICountry } from "../../types/countries";
import { User } from "../../types/users";
export declare class Subscription implements ISubscription {
    readonly id: string;
    readonly serviceProviderId: string;
    readonly countryId?: string | null;
    readonly name: string;
    readonly email: string;
    readonly passwordHash: string;
    readonly availableSlots: number;
    readonly expiresAt?: Date | null;
    readonly renewalInfo?: Prisma.JsonValue | null;
    readonly userPrice?: Prisma.Decimal | null;
    readonly currencyId?: string | null;
    readonly metadata?: Prisma.JsonValue | null;
    readonly isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly country?: ICountry | null;
    constructor(data: ISubscription);
    /**
     * Check if subscription has available slots
     */
    hasAvailableSlots(): boolean;
    /**
     * Check if subscription is active and not expired
     */
    isActiveAndValid(): boolean;
    /**
     * Validates subscription creation data
     */
    static validateCreateData(data: CreateSubscriptionData): void;
    /**
     * Validates subscription update data
     */
    static validateUpdateData(data: any): void;
    /**
     * Validates email format
     */
    private static isValidEmail;
    /**
     * Converts domain model to API response format
     */
    toResponse(): SubscriptionResponse;
    /**
     * Creates domain model from Prisma data
     */
    static fromPrisma(data: any): Subscription;
}
export declare class SubscriptionSlot implements ISubscriptionSlot {
    readonly id: string;
    readonly userId: string;
    readonly subscriptionId: string;
    readonly assignedAt: Date;
    readonly isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly user?: User;
    readonly subscription?: ISubscription;
    constructor(data: ISubscriptionSlot);
    /**
     * Validates slot assignment data
     */
    static validateAssignmentData(data: {
        userId: string;
        subscriptionId: string;
    }): void;
    /**
     * Converts domain model to API response format
     */
    toResponse(): SubscriptionSlotResponse;
    /**
     * Creates domain model from Prisma data
     */
    static fromPrisma(data: any): SubscriptionSlot;
}
export declare class SubscriptionRequest implements ISubscriptionRequest {
    readonly id: string;
    readonly userId: string;
    readonly serviceProviderId: string;
    readonly countryId?: string | null;
    readonly status: SubscriptionRequestStatus;
    readonly assignedSlotId?: string | null;
    readonly requestedAt: Date;
    readonly processedAt?: Date | null;
    readonly metadata?: Prisma.JsonValue | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly user?: User;
    readonly country?: ICountry | null;
    constructor(data: ISubscriptionRequest);
    /**
     * Check if request is pending
     */
    isPending(): boolean;
    /**
     * Check if request has been processed
     */
    isProcessed(): boolean;
    /**
     * Validates subscription request data
     */
    static validateRequestData(data: {
        userId: string;
        serviceProviderId: string;
        countryId?: string;
    }): void;
    /**
     * Converts domain model to API response format
     */
    toResponse(): SubscriptionRequestResponse;
    /**
     * Creates domain model from Prisma data
     */
    static fromPrisma(data: any): SubscriptionRequest;
}
//# sourceMappingURL=index.d.ts.map