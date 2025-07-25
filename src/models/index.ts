/**
 * Common types and interfaces
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  timestamp: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Central export for all domain models
 */

// User models
export { User } from "./users";

// Service Provider models
export { ServiceProvider } from "./serviceProviders";

// Subscription models
export { Subscription } from "./subscriptions";

// Country models
export { Country } from "./countries";

// Re-export Prisma types that are commonly used
export type { User as PrismaUser } from "@prisma/client";
export type { ServiceProvider as PrismaServiceProvider } from "@prisma/client";
export type { Subscription as PrismaSubscription } from "@prisma/client";
export type { Country as PrismaCountry } from "@prisma/client";

// Export common model interfaces for dependency injection
export type {
  User as IUser,
  IUserService,
  IUserRepository,
} from "../types/users";

export type {
  IServiceProvider,
  IServiceProviderService,
  IServiceProviderRepository,
} from "../types/serviceProviders";

export type {
  ISubscription,
  ISubscriptionService,
  ISubscriptionRepository,
} from "../types/subscriptions";

export type {
  ICountry,
  ICountryService,
  ICountryRepository,
} from "../types/countries";
