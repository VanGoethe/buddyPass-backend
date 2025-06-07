/**
 * Subscription Domain Model
 */
import { Prisma } from "@prisma/client";
import { ISubscription, CreateSubscriptionData, SubscriptionResponse } from "../../types/subscriptions";
import { ICountry } from "../../types/countries";
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
    readonly currency?: string | null;
    readonly metadata?: Prisma.JsonValue | null;
    readonly isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly country?: ICountry | null;
    constructor(data: ISubscription);
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
     * Creates a Subscription instance from Prisma result
     */
    static fromPrisma(data: any): Subscription;
}
//# sourceMappingURL=index.d.ts.map