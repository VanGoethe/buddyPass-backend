/**
 * Subscription Type Definitions
 */

import { Prisma } from "@prisma/client";
import { ICountry } from "../countries";
import { User } from "../users";

// Entity Interface
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
  currencyId?: string | null;
  metadata?: Prisma.JsonValue | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  country?: ICountry | null;
}

// Subscription Slot Entity Interface
export interface ISubscriptionSlot {
  id: string;
  userId: string;
  subscriptionId: string;
  assignedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  subscription?: ISubscription;
}

// Subscription Request Entity Interface
export interface ISubscriptionRequest {
  id: string;
  userId: string;
  serviceProviderId: string;
  countryId?: string | null;
  status: SubscriptionRequestStatus;
  assignedSlotId?: string | null;
  requestedAt: Date;
  processedAt?: Date | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  country?: ICountry | null;
}

// Subscription Request Status Enum
export enum SubscriptionRequestStatus {
  PENDING = "PENDING",
  ASSIGNED = "ASSIGNED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

// DTOs for API Requests
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
  currencyId?: string;
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
  currencyId?: string;
  metadata?: Prisma.JsonValue;
  isActive?: boolean;
}

// Subscription Request DTOs
export interface CreateSubscriptionRequestData {
  serviceProviderId: string;
  countryId?: string;
}

export interface SubscriptionRequestResponse {
  id: string;
  userId: string;
  serviceProviderId: string;
  countryId?: string | null;
  status: SubscriptionRequestStatus;
  assignedSlotId?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: string;
  updatedAt: string;
  serviceProvider?: {
    id: string;
    name: string;
    description?: string | null;
  };
  country?: {
    id: string;
    name: string;
    code: string;
    alpha3: string;
  } | null;
}

// Subscription Slot DTOs
export interface SubscriptionSlotResponse {
  id: string;
  userId: string;
  subscriptionId: string;
  assignedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    name: string;
    email: string;
    serviceProviderId: string;
    userPrice?: string | null;
    currencyId?: string | null;
    expiresAt?: string | null;
  };
}

// DTOs for API Responses
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
  currencyId?: string | null;
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

// Query Options
export interface SubscriptionQueryOptions {
  page?: number;
  limit?: number;
  sortBy?:
    | "name"
    | "email"
    | "availableSlots"
    | "expiresAt"
    | "createdAt"
    | "updatedAt";
  sortOrder?: "asc" | "desc";
  search?: string;
  serviceProviderId?: string;
  isActive?: boolean;
  countryId?: string;
}

// Repository Interface
export interface ISubscriptionRepository {
  create(
    data: CreateSubscriptionData & { passwordHash: string }
  ): Promise<ISubscription>;
  findById(id: string, includeCountry?: boolean): Promise<ISubscription | null>;
  findMany(options?: SubscriptionQueryOptions): Promise<{
    subscriptions: ISubscription[];
    total: number;
  }>;
  update(
    id: string,
    data: UpdateSubscriptionData & { passwordHash?: string }
  ): Promise<ISubscription>;
  delete(id: string): Promise<void>;
  existsByEmail(email: string, excludeId?: string): Promise<boolean>;
  findByServiceProviderId(serviceProviderId: string): Promise<ISubscription[]>;
  countByServiceProviderId(serviceProviderId: string): Promise<number>;
  findAvailableByServiceProviderId(
    serviceProviderId: string,
    countryId?: string
  ): Promise<ISubscription[]>;
  decrementAvailableSlots(subscriptionId: string): Promise<ISubscription>;
}

// Subscription Slot Repository Interface
export interface ISubscriptionSlotRepository {
  create(data: {
    userId: string;
    subscriptionId: string;
  }): Promise<ISubscriptionSlot>;
  findByUserId(userId: string): Promise<ISubscriptionSlot[]>;
  findBySubscriptionId(subscriptionId: string): Promise<ISubscriptionSlot[]>;
  findByUserAndSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<ISubscriptionSlot | null>;
  findByUserAndServiceProvider(
    userId: string,
    serviceProviderId: string
  ): Promise<ISubscriptionSlot | null>;
  countBySubscriptionId(subscriptionId: string): Promise<number>;
  delete(id: string): Promise<void>;
  deleteByUserAndSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<void>;
}

// Subscription Request Repository Interface
export interface ISubscriptionRequestRepository {
  create(
    data: CreateSubscriptionRequestData & { userId: string }
  ): Promise<ISubscriptionRequest>;
  findById(id: string): Promise<ISubscriptionRequest | null>;
  findByUserId(userId: string): Promise<ISubscriptionRequest[]>;
  findPendingRequests(): Promise<ISubscriptionRequest[]>;
  findPendingByServiceProvider(
    serviceProviderId: string
  ): Promise<ISubscriptionRequest[]>;
  updateStatus(
    id: string,
    status: SubscriptionRequestStatus
  ): Promise<ISubscriptionRequest>;
  update(
    id: string,
    data: {
      status?: SubscriptionRequestStatus;
      assignedSlotId?: string | null;
      processedAt?: Date;
      metadata?: Prisma.JsonValue;
    }
  ): Promise<ISubscriptionRequest>;
  delete(id: string): Promise<void>;
}

// Service Interface
export interface ISubscriptionService {
  createSubscription(
    data: CreateSubscriptionData
  ): Promise<SubscriptionResponse>;
  getSubscriptionById(id: string): Promise<SubscriptionResponse>;
  getSubscriptions(
    options?: SubscriptionQueryOptions
  ): Promise<SubscriptionListResponse>;
  updateSubscription(
    id: string,
    data: UpdateSubscriptionData
  ): Promise<SubscriptionResponse>;
  deleteSubscription(id: string): Promise<void>;
  getSubscriptionsByServiceProvider(
    serviceProviderId: string
  ): Promise<SubscriptionResponse[]>;
  requestSubscriptionSlot(
    userId: string,
    data: CreateSubscriptionRequestData
  ): Promise<SubscriptionRequestResponse>;
  getUserSubscriptionSlots(userId: string): Promise<SubscriptionSlotResponse[]>;
}

// Slot Assignment Service Interface
export interface ISlotAssignmentService {
  assignSlotToUser(
    userId: string,
    serviceProviderId: string,
    countryId?: string
  ): Promise<{
    success: boolean;
    slotAssignment?: ISubscriptionSlot;
    message: string;
  }>;
  findAvailableSlot(
    serviceProviderId: string,
    countryId?: string
  ): Promise<ISubscription | null>;
  validateSlotAssignment(subscriptionId: string): Promise<boolean>;
}
