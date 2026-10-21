import { Prisma } from "@prisma/client";
import {
  ISubscription,
  ISubscriptionSlot,
  ISubscriptionRequest,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionResponse,
  SubscriptionSlotResponse,
  SubscriptionRequestResponse,
  SubscriptionRequestStatus,
} from "../../types/subscriptions";
import { ICountry } from "../../types/countries";
import { User } from "../../types/users";
import { ValidationError } from "../../utils/errors";

type SubscriptionRecord = Prisma.SubscriptionGetPayload<{
  include: { country: true };
}> & { _count?: { subscriptionSlots: number } };

type SlotRecord = Prisma.SubscriptionSlotGetPayload<{
  include: { subscription: { include: { country: true } } };
}>;

type RequestRecord = Prisma.SubscriptionRequestGetPayload<{
  include: { country: true };
}>;

export class Subscription implements ISubscription {
  public readonly id: string;
  public readonly serviceProviderId: string;
  public readonly countryId?: string | null;
  public readonly name: string;
  public readonly email: string;
  public readonly passwordCiphertext: string;
  public readonly passwordIv: string;
  public readonly passwordTag: string;
  public readonly keyVersion: number;
  public readonly needsCredentialReset: boolean;
  public readonly maxSlots: number;
  public readonly occupiedSlots?: number;
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
    this.passwordCiphertext = data.passwordCiphertext;
    this.passwordIv = data.passwordIv;
    this.passwordTag = data.passwordTag;
    this.keyVersion = data.keyVersion;
    this.needsCredentialReset = data.needsCredentialReset;
    this.maxSlots = data.maxSlots;
    this.occupiedSlots = data.occupiedSlots;
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

  public hasAvailableSlots(): boolean {
    const occupied = this.occupiedSlots ?? 0;
    return this.maxSlots - occupied > 0;
  }

  public isActiveAndValid(): boolean {
    if (!this.isActive) return false;
    if (this.expiresAt && this.expiresAt <= new Date()) return false;
    return true;
  }

  public static validateCreateData(data: CreateSubscriptionData): void {
    if (!data.serviceProviderId?.trim()) {
      throw new ValidationError("Service provider ID is required");
    }
    if (!data.name?.trim()) {
      throw new ValidationError("Subscription name is required");
    }
    if (data.name.trim().length > 100) {
      throw new ValidationError("Subscription name must be 100 characters or less");
    }
    if (!data.email?.trim() || !this.isValidEmail(data.email)) {
      throw new ValidationError("A valid email is required");
    }
    if (!data.password || data.password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters long");
    }
    if (!data.maxSlots || data.maxSlots < 1 || data.maxSlots > 100) {
      throw new ValidationError("Max slots must be between 1 and 100");
    }
    if (data.userPrice !== undefined && data.userPrice < 0) {
      throw new ValidationError("User price cannot be negative");
    }
    if (data.expiresAt && data.expiresAt <= new Date()) {
      throw new ValidationError("Expiration date must be in the future");
    }
  }

  public static validateUpdateData(data: UpdateSubscriptionData): void {
    if (data.name !== undefined && (!data.name.trim() || data.name.trim().length > 100)) {
      throw new ValidationError("Subscription name must be 1 to 100 characters");
    }
    if (data.email !== undefined && !this.isValidEmail(data.email)) {
      throw new ValidationError("Invalid email format");
    }
    if (data.password !== undefined && data.password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters long");
    }
    if (
      data.maxSlots !== undefined &&
      (data.maxSlots < 1 || data.maxSlots > 100)
    ) {
      throw new ValidationError("Max slots must be between 1 and 100");
    }
    if (data.userPrice !== undefined && data.userPrice < 0) {
      throw new ValidationError("User price cannot be negative");
    }
    if (data.expiresAt && data.expiresAt <= new Date()) {
      throw new ValidationError("Expiration date must be in the future");
    }
  }

  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  public toResponse(): SubscriptionResponse {
    const occupied = this.occupiedSlots ?? 0;
    return {
      id: this.id,
      serviceProviderId: this.serviceProviderId,
      countryId: this.countryId,
      name: this.name,
      email: this.email,
      maxSlots: this.maxSlots,
      availableSlots: Math.max(this.maxSlots - occupied, 0),
      needsCredentialReset: this.needsCredentialReset,
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

  public static fromPrisma(data: SubscriptionRecord): Subscription {
    return new Subscription({
      id: data.id,
      serviceProviderId: data.serviceProviderId,
      countryId: data.countryId,
      name: data.name,
      email: data.email,
      passwordCiphertext: data.passwordCiphertext,
      passwordIv: data.passwordIv,
      passwordTag: data.passwordTag,
      keyVersion: data.keyVersion,
      needsCredentialReset: data.needsCredentialReset,
      maxSlots: data.maxSlots,
      occupiedSlots: data._count?.subscriptionSlots,
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
  public readonly releasedAt?: Date | null;
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
    this.releasedAt = data.releasedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.user = data.user;
    this.subscription = data.subscription;
  }

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

  public static fromPrisma(data: SlotRecord): SubscriptionSlot {
    return new SubscriptionSlot({
      id: data.id,
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      assignedAt: data.assignedAt,
      isActive: data.isActive,
      releasedAt: data.releasedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      subscription: data.subscription
        ? Subscription.fromPrisma(data.subscription)
        : undefined,
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

  public static fromPrisma(data: RequestRecord): SubscriptionRequest {
    return new SubscriptionRequest({
      id: data.id,
      userId: data.userId,
      serviceProviderId: data.serviceProviderId,
      countryId: data.countryId,
      status: data.status as SubscriptionRequestStatus,
      assignedSlotId: data.assignedSlotId,
      requestedAt: data.requestedAt,
      processedAt: data.processedAt,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      country: data.country,
    });
  }
}
