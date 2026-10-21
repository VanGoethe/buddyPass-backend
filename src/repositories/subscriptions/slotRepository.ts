import { PrismaClient } from "@prisma/client";
import {
  ISubscriptionSlot,
  ISubscriptionSlotRepository,
} from "../../types/subscriptions";
import { SubscriptionSlot } from "../../models/subscriptions";

const slotInclude = {
  subscription: { include: { country: true } },
} as const;

export class PrismaSubscriptionSlotRepository
  implements ISubscriptionSlotRepository
{
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    subscriptionId: string;
  }): Promise<ISubscriptionSlot> {
    const slot = await this.prisma.subscriptionSlot.create({
      data,
      include: slotInclude,
    });
    return SubscriptionSlot.fromPrisma(slot);
  }

  async findById(id: string): Promise<ISubscriptionSlot | null> {
    const slot = await this.prisma.subscriptionSlot.findUnique({
      where: { id },
      include: slotInclude,
    });
    return slot ? SubscriptionSlot.fromPrisma(slot) : null;
  }

  async findByUserId(userId: string): Promise<ISubscriptionSlot[]> {
    const slots = await this.prisma.subscriptionSlot.findMany({
      where: { userId, isActive: true, releasedAt: null },
      include: slotInclude,
      orderBy: { createdAt: "desc" },
    });
    return slots.map((slot) => SubscriptionSlot.fromPrisma(slot));
  }

  async findBySubscriptionId(
    subscriptionId: string
  ): Promise<ISubscriptionSlot[]> {
    const slots = await this.prisma.subscriptionSlot.findMany({
      where: { subscriptionId, isActive: true, releasedAt: null },
      include: slotInclude,
    });
    return slots.map((slot) => SubscriptionSlot.fromPrisma(slot));
  }

  async findByUserAndSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<ISubscriptionSlot | null> {
    const slot = await this.prisma.subscriptionSlot.findUnique({
      where: { userId_subscriptionId: { userId, subscriptionId } },
      include: slotInclude,
    });
    return slot ? SubscriptionSlot.fromPrisma(slot) : null;
  }

  async findActiveByUserAndProvider(
    userId: string,
    serviceProviderId: string
  ): Promise<ISubscriptionSlot | null> {
    const slot = await this.prisma.subscriptionSlot.findFirst({
      where: {
        userId,
        isActive: true,
        releasedAt: null,
        subscription: { serviceProviderId },
      },
      include: slotInclude,
    });
    return slot ? SubscriptionSlot.fromPrisma(slot) : null;
  }

  async countActiveBySubscriptionId(subscriptionId: string): Promise<number> {
    return this.prisma.subscriptionSlot.count({
      where: { subscriptionId, isActive: true, releasedAt: null },
    });
  }

  async release(id: string): Promise<ISubscriptionSlot> {
    const slot = await this.prisma.subscriptionSlot.update({
      where: { id },
      data: { isActive: false, releasedAt: new Date() },
      include: slotInclude,
    });
    return SubscriptionSlot.fromPrisma(slot);
  }
}
