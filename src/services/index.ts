import { getPrismaClient } from "../config/database";
import { PrismaClient } from "@prisma/client";

/**
 * Base service class with common functionality
 */
export abstract class BaseService {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Handle service errors consistently
   */
  protected handleError(error: unknown, operation: string): never {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to ${operation}: ${message}`);
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }
  }
}

/**
 * Service exports
 * Centralized exports for all service layers
 */

// User services
export { UserService } from "./users";
export type { IUserService } from "../types/users";

// Subscription services
export { SubscriptionService } from "./subscriptions";
export type { ISubscriptionService } from "../types/subscriptions";

// Service Provider services
export { ServiceProviderService } from "./serviceProviders";
export type { IServiceProviderService } from "../types/serviceProviders";
