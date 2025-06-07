/**
 * Subscription Repository Implementation
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  ISubscriptionRepository,
  ISubscription,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionQueryOptions,
} from "../../types/subscriptions";
import { Subscription } from "../../models/subscriptions";

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    data: CreateSubscriptionData & { passwordHash: string }
  ): Promise<ISubscription> {
    try {
      const subscription = await this.prisma.subscription.create({
        data: {
          serviceProviderId: data.serviceProviderId,
          countryId: data.countryId || null,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          passwordHash: data.passwordHash,
          availableSlots: data.availableSlots,
          expiresAt: data.expiresAt || null,
          renewalInfo: (data.renewalInfo as any) || null,
          userPrice: data.userPrice ? new Prisma.Decimal(data.userPrice) : null,
          currency: data.currency?.toUpperCase() || null,
          metadata: (data.metadata as any) || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      return Subscription.fromPrisma(subscription);
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("A subscription with this email already exists");
      }
      if (error.code === "P2003") {
        throw new Error("Service provider or country not found");
      }
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async findById(
    id: string,
    includeCountry = false
  ): Promise<ISubscription | null> {
    try {
      const include: any = {};
      if (includeCountry) {
        include.country = true;
      }

      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include,
      });

      return subscription ? Subscription.fromPrisma(subscription) : null;
    } catch (error: any) {
      throw new Error(`Failed to find subscription: ${error.message}`);
    }
  }

  async findMany(options: SubscriptionQueryOptions = {}): Promise<{
    subscriptions: ISubscription[];
    total: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        serviceProviderId,
        isActive,
        countryId,
      } = options;

      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100); // Cap at 100 items per page

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      if (serviceProviderId) {
        where.serviceProviderId = serviceProviderId;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (countryId) {
        where.countryId = countryId;
      }

      // Build orderBy clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [subscriptions, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            country: true,
          },
        }),
        this.prisma.subscription.count({ where }),
      ]);

      return {
        subscriptions: subscriptions.map((sub) => Subscription.fromPrisma(sub)),
        total,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
  }

  async update(
    id: string,
    data: UpdateSubscriptionData & { passwordHash?: string }
  ): Promise<ISubscription> {
    try {
      const updateData: any = {};

      if (data.name !== undefined) {
        updateData.name = data.name.trim();
      }

      if (data.email !== undefined) {
        updateData.email = data.email.trim().toLowerCase();
      }

      if (data.passwordHash !== undefined) {
        updateData.passwordHash = data.passwordHash;
      }

      if (data.availableSlots !== undefined) {
        updateData.availableSlots = data.availableSlots;
      }

      if (data.countryId !== undefined) {
        updateData.countryId = data.countryId || null;
      }

      if (data.expiresAt !== undefined) {
        updateData.expiresAt = data.expiresAt || null;
      }

      if (data.renewalInfo !== undefined) {
        updateData.renewalInfo = (data.renewalInfo as any) || null;
      }

      if (data.userPrice !== undefined) {
        updateData.userPrice = data.userPrice
          ? new Prisma.Decimal(data.userPrice)
          : null;
      }

      if (data.currency !== undefined) {
        updateData.currency = data.currency?.toUpperCase() || null;
      }

      if (data.metadata !== undefined) {
        updateData.metadata = (data.metadata as any) || null;
      }

      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      const subscription = await this.prisma.subscription.update({
        where: { id },
        data: updateData,
      });

      return Subscription.fromPrisma(subscription);
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new Error("Subscription not found");
      }
      if (error.code === "P2002") {
        throw new Error("A subscription with this email already exists");
      }
      if (error.code === "P2003") {
        throw new Error("Country not found");
      }
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.subscription.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        throw new Error("Subscription not found");
      }
      throw new Error(`Failed to delete subscription: ${error.message}`);
    }
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    try {
      const where: any = {
        email: {
          equals: email.trim().toLowerCase(),
          mode: "insensitive",
        },
      };

      if (excludeId) {
        where.id = {
          not: excludeId,
        };
      }

      const count = await this.prisma.subscription.count({ where });
      return count > 0;
    } catch (error: any) {
      throw new Error(`Failed to check subscription email: ${error.message}`);
    }
  }

  async findByServiceProviderId(
    serviceProviderId: string
  ): Promise<ISubscription[]> {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
        where: { serviceProviderId },
        orderBy: { createdAt: "desc" },
      });

      return subscriptions.map((sub) => Subscription.fromPrisma(sub));
    } catch (error: any) {
      throw new Error(
        `Failed to find subscriptions by service provider: ${error.message}`
      );
    }
  }

  async countByServiceProviderId(serviceProviderId: string): Promise<number> {
    try {
      return await this.prisma.subscription.count({
        where: { serviceProviderId },
      });
    } catch (error: any) {
      throw new Error(
        `Failed to count subscriptions by service provider: ${error.message}`
      );
    }
  }
}

/**
 * Factory function to create Subscription repository
 */
export function createSubscriptionRepository(
  prisma: PrismaClient
): ISubscriptionRepository {
  return new PrismaSubscriptionRepository(prisma);
}
