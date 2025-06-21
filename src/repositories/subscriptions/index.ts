/**
 * Subscription Repository Implementation
 */

import { PrismaClient } from "@prisma/client";
import {
  ISubscriptionRepository,
  ISubscriptionSlotRepository,
  ISubscriptionRequestRepository,
  ISubscription,
  ISubscriptionSlot,
  ISubscriptionRequest,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionQueryOptions,
  CreateSubscriptionRequestData,
  SubscriptionRequestStatus,
} from "../../types/subscriptions";
import {
  Subscription,
  SubscriptionSlot,
  SubscriptionRequest,
} from "../../models/subscriptions";

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    data: CreateSubscriptionData & { passwordHash: string }
  ): Promise<ISubscription> {
    const subscription = await this.prisma.subscription.create({
      data: {
        serviceProviderId: data.serviceProviderId,
        countryId: data.countryId,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        availableSlots: data.availableSlots,
        expiresAt: data.expiresAt,
        renewalInfo: data.renewalInfo as any,
        userPrice: data.userPrice,
        currencyId: data.currencyId,
        metadata: data.metadata as any,
        isActive: data.isActive ?? true,
      },
      include: {
        country: true,
      },
    });

    return Subscription.fromPrisma(subscription);
  }

  async findById(
    id: string,
    includeCountry: boolean = false
  ): Promise<ISubscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        country: includeCountry,
      },
    });

    return subscription ? Subscription.fromPrisma(subscription) : null;
  }

  async findMany(options: SubscriptionQueryOptions = {}): Promise<{
    subscriptions: ISubscription[];
    total: number;
  }> {
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

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
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

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          country: true,
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions: subscriptions.map((s) => Subscription.fromPrisma(s)),
      total,
    };
  }

  async update(
    id: string,
    data: UpdateSubscriptionData & { passwordHash?: string }
  ): Promise<ISubscription> {
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        countryId: data.countryId,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        availableSlots: data.availableSlots,
        expiresAt: data.expiresAt,
        renewalInfo: data.renewalInfo as any,
        userPrice: data.userPrice,
        currencyId: data.currencyId,
        metadata: data.metadata as any,
        isActive: data.isActive,
      },
      include: {
        country: true,
      },
    });

    return Subscription.fromPrisma(subscription);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subscription.delete({
      where: { id },
    });
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const where: any = { email };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.subscription.count({ where });
    return count > 0;
  }

  async findByServiceProviderId(
    serviceProviderId: string
  ): Promise<ISubscription[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { serviceProviderId },
      include: {
        country: true,
      },
    });

    return subscriptions.map((s) => Subscription.fromPrisma(s));
  }

  async countByServiceProviderId(serviceProviderId: string): Promise<number> {
    return this.prisma.subscription.count({
      where: { serviceProviderId },
    });
  }

  async findAvailableByServiceProviderId(
    serviceProviderId: string,
    countryId?: string
  ): Promise<ISubscription[]> {
    const where: any = {
      serviceProviderId,
      availableSlots: { gt: 0 },
      isActive: true,
    };

    if (countryId) {
      where.countryId = countryId;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      orderBy: [
        { availableSlots: "desc" }, // Fill subscriptions with fewer available slots first
        { createdAt: "asc" }, // Then oldest first
      ],
      include: {
        country: true,
      },
    });

    return subscriptions.map((s) => Subscription.fromPrisma(s));
  }

  async decrementAvailableSlots(
    subscriptionId: string
  ): Promise<ISubscription> {
    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        availableSlots: { decrement: 1 },
      },
      include: {
        country: true,
      },
    });

    return Subscription.fromPrisma(subscription);
  }
}

export class PrismaSubscriptionSlotRepository
  implements ISubscriptionSlotRepository
{
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    subscriptionId: string;
  }): Promise<ISubscriptionSlot> {
    const slot = await this.prisma.subscriptionSlot.create({
      data: {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
      },
      include: {
        user: true,
        subscription: {
          include: {
            country: true,
          },
        },
      },
    });

    return SubscriptionSlot.fromPrisma(slot);
  }

  async findByUserId(userId: string): Promise<ISubscriptionSlot[]> {
    const slots = await this.prisma.subscriptionSlot.findMany({
      where: { userId, isActive: true },
      include: {
        user: true,
        subscription: {
          include: {
            country: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return slots.map((slot) => SubscriptionSlot.fromPrisma(slot));
  }

  async findBySubscriptionId(
    subscriptionId: string
  ): Promise<ISubscriptionSlot[]> {
    const slots = await this.prisma.subscriptionSlot.findMany({
      where: { subscriptionId, isActive: true },
      include: {
        user: true,
        subscription: {
          include: {
            country: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return slots.map((slot) => SubscriptionSlot.fromPrisma(slot));
  }

  async findByUserAndSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<ISubscriptionSlot | null> {
    const slot = await this.prisma.subscriptionSlot.findFirst({
      where: { userId, subscriptionId, isActive: true },
      include: {
        user: true,
        subscription: {
          include: {
            country: true,
          },
        },
      },
    });

    return slot ? SubscriptionSlot.fromPrisma(slot) : null;
  }

  async findByUserAndServiceProvider(
    userId: string,
    serviceProviderId: string
  ): Promise<ISubscriptionSlot | null> {
    const slot = await this.prisma.subscriptionSlot.findFirst({
      where: {
        userId,
        isActive: true,
        subscription: {
          serviceProviderId,
        },
      },
      include: {
        user: true,
        subscription: {
          include: {
            country: true,
          },
        },
      },
    });

    return slot ? SubscriptionSlot.fromPrisma(slot) : null;
  }

  async countBySubscriptionId(subscriptionId: string): Promise<number> {
    return this.prisma.subscriptionSlot.count({
      where: { subscriptionId, isActive: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subscriptionSlot.delete({
      where: { id },
    });
  }

  async deleteByUserAndSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<void> {
    await this.prisma.subscriptionSlot.deleteMany({
      where: { userId, subscriptionId },
    });
  }
}

export class PrismaSubscriptionRequestRepository
  implements ISubscriptionRequestRepository
{
  constructor(private prisma: PrismaClient) {}

  async create(
    data: CreateSubscriptionRequestData & { userId: string }
  ): Promise<ISubscriptionRequest> {
    const request = await this.prisma.subscriptionRequest.create({
      data: {
        userId: data.userId,
        serviceProviderId: data.serviceProviderId,
        countryId: data.countryId,
      },
      include: {
        user: true,
        serviceProvider: true,
        country: true,
      },
    });

    return SubscriptionRequest.fromPrisma(request);
  }

  async findById(id: string): Promise<ISubscriptionRequest | null> {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: { id },
      include: {
        user: true,
        serviceProvider: true,
        country: true,
      },
    });

    return request ? SubscriptionRequest.fromPrisma(request) : null;
  }

  async findByUserId(userId: string): Promise<ISubscriptionRequest[]> {
    const requests = await this.prisma.subscriptionRequest.findMany({
      where: { userId },
      include: {
        user: true,
        serviceProvider: true,
        country: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((request) => SubscriptionRequest.fromPrisma(request));
  }

  async findPendingRequests(): Promise<ISubscriptionRequest[]> {
    const requests = await this.prisma.subscriptionRequest.findMany({
      where: { status: SubscriptionRequestStatus.PENDING },
      include: {
        user: true,
        serviceProvider: true,
        country: true,
      },
      orderBy: { createdAt: "asc" }, // FIFO processing
    });

    return requests.map((request) => SubscriptionRequest.fromPrisma(request));
  }

  async findPendingByServiceProvider(
    serviceProviderId: string
  ): Promise<ISubscriptionRequest[]> {
    const requests = await this.prisma.subscriptionRequest.findMany({
      where: {
        serviceProviderId,
        status: SubscriptionRequestStatus.PENDING,
      },
      include: {
        user: true,
        serviceProvider: true,
        country: true,
      },
      orderBy: { createdAt: "asc" }, // FIFO processing
    });

    return requests.map((request) => SubscriptionRequest.fromPrisma(request));
  }

  async updateStatus(
    id: string,
    status: SubscriptionRequestStatus
  ): Promise<ISubscriptionRequest> {
    const request = await this.prisma.subscriptionRequest.update({
      where: { id },
      data: { status, processedAt: new Date() },
      include: {
        user: true,
        serviceProvider: true,
        country: true,
      },
    });

    return SubscriptionRequest.fromPrisma(request);
  }

  async update(
    id: string,
    data: {
      status?: SubscriptionRequestStatus;
      assignedSlotId?: string | null;
      processedAt?: Date;
      metadata?: any;
    }
  ): Promise<ISubscriptionRequest> {
    const request = await this.prisma.subscriptionRequest.update({
      where: { id },
      data,
      include: {
        user: true,
        serviceProvider: true,
        country: true,
      },
    });

    return SubscriptionRequest.fromPrisma(request);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subscriptionRequest.delete({
      where: { id },
    });
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
