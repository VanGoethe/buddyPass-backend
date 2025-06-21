/**
 * Subscription Domain Model
 */

import { Prisma } from "@prisma/client";
import {
  ISubscription,
  ISubscriptionSlot,
  ISubscriptionRequest,
  CreateSubscriptionData,
  SubscriptionResponse,
  SubscriptionSlotResponse,
  SubscriptionRequestResponse,
  SubscriptionRequestStatus,
} from "../../types/subscriptions";
import { ICountry } from "../../types/countries";
import { User } from "../../types/users";

export class Subscription implements ISubscription {
  public readonly id: string;
  public readonly serviceProviderId: string;
  public readonly countryId?: string | null;
  public readonly name: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly availableSlots: number;
  public readonly expiresAt?: Date | null;
  public readonly renewalInfo?: Prisma.JsonValue | null;
  public readonly userPrice?: Prisma.Decimal | null;
  public readonly currencyId?: string | null;
  public readonly metadata?: Prisma.JsonValue | null;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly country?: ICountry | null;

  constructor(data: ISubscription) {
    this.id = data.id;
    this.serviceProviderId = data.serviceProviderId;
    this.countryId = data.countryId;
    this.name = data.name;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.availableSlots = data.availableSlots;
    this.expiresAt = data.expiresAt;
    this.renewalInfo = data.renewalInfo;
    this.userPrice = data.userPrice;
    this.currencyId = data.currencyId;
    this.metadata = data.metadata;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.country = data.country;
  }

  /**
   * Check if subscription has available slots
   */
  public hasAvailableSlots(): boolean {
    return this.availableSlots > 0;
  }

  /**
   * Check if subscription is active and not expired
   */
  public isActiveAndValid(): boolean {
    if (!this.isActive) return false;
    if (this.expiresAt && this.expiresAt <= new Date()) return false;
    return true;
  }

  /**
   * Validates subscription creation data
   */
  public static validateCreateData(data: CreateSubscriptionData): void {
    if (!data.serviceProviderId || data.serviceProviderId.trim().length === 0) {
      throw new Error("Service provider ID is required");
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Subscription name is required");
    }

    if (data.name.trim().length > 100) {
      throw new Error("Subscription name must be 100 characters or less");
    }

    if (!data.email || data.email.trim().length === 0) {
      throw new Error("Email is required");
    }

    if (!this.isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }

    if (!data.password || data.password.length === 0) {
      throw new Error("Password is required");
    }

    if (data.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    if (!data.availableSlots || data.availableSlots < 1) {
      throw new Error("Available slots must be at least 1");
    }

    if (data.availableSlots > 100) {
      throw new Error("Available slots cannot exceed 100");
    }

    if (data.userPrice !== undefined && data.userPrice < 0) {
      throw new Error("User price cannot be negative");
    }

    // Currency validation is handled by the Currency entity and foreign key constraints

    if (data.expiresAt && data.expiresAt <= new Date()) {
      throw new Error("Expiration date must be in the future");
    }
  }

  /**
   * Validates subscription update data
   */
  public static validateUpdateData(data: any): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error("Subscription name is required");
      }

      if (data.name.trim().length > 100) {
        throw new Error("Subscription name must be 100 characters or less");
      }
    }

    if (data.email !== undefined) {
      if (!data.email || data.email.trim().length === 0) {
        throw new Error("Email is required");
      }

      if (!this.isValidEmail(data.email)) {
        throw new Error("Invalid email format");
      }
    }

    if (data.password !== undefined) {
      if (!data.password || data.password.length === 0) {
        throw new Error("Password is required");
      }

      if (data.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
    }

    if (data.availableSlots !== undefined) {
      if (!data.availableSlots || data.availableSlots < 1) {
        throw new Error("Available slots must be at least 1");
      }

      if (data.availableSlots > 100) {
        throw new Error("Available slots cannot exceed 100");
      }
    }

    if (data.userPrice !== undefined && data.userPrice < 0) {
      throw new Error("User price cannot be negative");
    }

    // Currency validation is handled by the Currency entity and foreign key constraints

    if (
      data.expiresAt !== undefined &&
      data.expiresAt &&
      data.expiresAt <= new Date()
    ) {
      throw new Error("Expiration date must be in the future");
    }
  }

  /**
   * Validates email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Converts domain model to API response format
   */
  public toResponse(): SubscriptionResponse {
    return {
      id: this.id,
      serviceProviderId: this.serviceProviderId,
      countryId: this.countryId,
      name: this.name,
      email: this.email,
      availableSlots: this.availableSlots,
      country: this.country
        ? {
            id: this.country.id,
            name: this.country.name,
            code: this.country.code,
            alpha3: this.country.alpha3,
          }
        : null,
      expiresAt: this.expiresAt?.toISOString() || null,
      renewalInfo: this.renewalInfo,
      userPrice: this.userPrice?.toString() || null,
      currencyId: this.currencyId,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Creates domain model from Prisma data
   */
  public static fromPrisma(data: any): Subscription {
    return new Subscription({
      id: data.id,
      serviceProviderId: data.serviceProviderId,
      countryId: data.countryId,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      availableSlots: data.availableSlots,
      expiresAt: data.expiresAt,
      renewalInfo: data.renewalInfo,
      userPrice: data.userPrice,
      currencyId: data.currencyId,
      metadata: data.metadata,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      country: data.country,
    });
  }
}

export class SubscriptionSlot implements ISubscriptionSlot {
  public readonly id: string;
  public readonly userId: string;
  public readonly subscriptionId: string;
  public readonly assignedAt: Date;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly user?: User;
  public readonly subscription?: ISubscription;

  constructor(data: ISubscriptionSlot) {
    this.id = data.id;
    this.userId = data.userId;
    this.subscriptionId = data.subscriptionId;
    this.assignedAt = data.assignedAt;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.user = data.user;
    this.subscription = data.subscription;
  }

  /**
   * Validates slot assignment data
   */
  public static validateAssignmentData(data: {
    userId: string;
    subscriptionId: string;
  }): void {
    if (!data.userId || data.userId.trim().length === 0) {
      throw new Error("User ID is required");
    }

    if (!data.subscriptionId || data.subscriptionId.trim().length === 0) {
      throw new Error("Subscription ID is required");
    }
  }

  /**
   * Converts domain model to API response format
   */
  public toResponse(): SubscriptionSlotResponse {
    return {
      id: this.id,
      userId: this.userId,
      subscriptionId: this.subscriptionId,
      assignedAt: this.assignedAt.toISOString(),
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      subscription: this.subscription
        ? {
            id: this.subscription.id,
            name: this.subscription.name,
            email: this.subscription.email,
            serviceProviderId: this.subscription.serviceProviderId,
            userPrice: this.subscription.userPrice?.toString() || null,
            currencyId: this.subscription.currencyId,
            expiresAt: this.subscription.expiresAt?.toISOString() || null,
          }
        : undefined,
    };
  }

  /**
   * Creates domain model from Prisma data
   */
  public static fromPrisma(data: any): SubscriptionSlot {
    return new SubscriptionSlot({
      id: data.id,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      assignedAt: data.assignedAt,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      user: data.user,
      subscription: data.subscription,
    });
  }
}

export class SubscriptionRequest implements ISubscriptionRequest {
  public readonly id: string;
  public readonly userId: string;
  public readonly serviceProviderId: string;
  public readonly countryId?: string | null;
  public readonly status: SubscriptionRequestStatus;
  public readonly assignedSlotId?: string | null;
  public readonly requestedAt: Date;
  public readonly processedAt?: Date | null;
  public readonly metadata?: Prisma.JsonValue | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly user?: User;
  public readonly country?: ICountry | null;

  constructor(data: ISubscriptionRequest) {
    this.id = data.id;
    this.userId = data.userId;
    this.serviceProviderId = data.serviceProviderId;
    this.countryId = data.countryId;
    this.status = data.status;
    this.assignedSlotId = data.assignedSlotId;
    this.requestedAt = data.requestedAt;
    this.processedAt = data.processedAt;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.user = data.user;
    this.country = data.country;
  }

  /**
   * Check if request is pending
   */
  public isPending(): boolean {
    return this.status === SubscriptionRequestStatus.PENDING;
  }

  /**
   * Check if request has been processed
   */
  public isProcessed(): boolean {
    return this.status !== SubscriptionRequestStatus.PENDING;
  }

  /**
   * Validates subscription request data
   */
  public static validateRequestData(data: {
    userId: string;
    serviceProviderId: string;
    countryId?: string;
  }): void {
    if (!data.userId || data.userId.trim().length === 0) {
      throw new Error("User ID is required");
    }

    if (!data.serviceProviderId || data.serviceProviderId.trim().length === 0) {
      throw new Error("Service provider ID is required");
    }
  }

  /**
   * Converts domain model to API response format
   */
  public toResponse(): SubscriptionRequestResponse {
    return {
      id: this.id,
      userId: this.userId,
      serviceProviderId: this.serviceProviderId,
      countryId: this.countryId,
      status: this.status,
      assignedSlotId: this.assignedSlotId,
      requestedAt: this.requestedAt.toISOString(),
      processedAt: this.processedAt?.toISOString() || null,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      country: this.country
        ? {
            id: this.country.id,
            name: this.country.name,
            code: this.country.code,
            alpha3: this.country.alpha3,
          }
        : null,
    };
  }

  /**
   * Creates domain model from Prisma data
   */
  public static fromPrisma(data: any): SubscriptionRequest {
    return new SubscriptionRequest({
      id: data.id,
      userId: data.userId,
      serviceProviderId: data.serviceProviderId,
      countryId: data.countryId,
      status: data.status,
      assignedSlotId: data.assignedSlotId,
      requestedAt: data.requestedAt,
      processedAt: data.processedAt,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      user: data.user,
      country: data.country,
    });
  }
}
