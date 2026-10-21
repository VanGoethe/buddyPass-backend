import { Prisma, PrismaClient } from "@prisma/client";
import {
  ISubscriptionRepository,
  ISubscription,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionQueryOptions,
  StoredCredential,
} from "../../types/subscriptions";
import { Subscription } from "../../models/subscriptions";
import { subscriptionInclude, toInputJson } from "./helpers";

type CreateInput = Omit<CreateSubscriptionData, "password"> & StoredCredential;
type UpdateInput = Omit<UpdateSubscriptionData, "password"> &
  Partial<StoredCredential>;

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateInput): Promise<ISubscription> {
    const subscription = await this.prisma.subscription.create({
      data: {
        serviceProviderId: data.serviceProviderId,
        countryId: data.countryId,
        name: data.name,
        email: data.email,
        passwordCiphertext: data.passwordCiphertext,
        passwordIv: data.passwordIv,
        passwordTag: data.passwordTag,
        keyVersion: data.keyVersion,
        needsCredentialReset: data.needsCredentialReset ?? false,
        maxSlots: data.maxSlots,
        expiresAt: data.expiresAt,
        renewalInfo: toInputJson(data.renewalInfo),
        userPrice: data.userPrice,
        currencyId: data.currencyId,
        metadata: toInputJson(data.metadata),
        isActive: data.isActive ?? true,
      },
      include: subscriptionInclude,
    });
    return Subscription.fromPrisma(subscription);
  }

  async findById(id: string): Promise<ISubscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: subscriptionInclude,
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

    const where: Prisma.SubscriptionWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (serviceProviderId) where.serviceProviderId = serviceProviderId;
    if (isActive !== undefined) where.isActive = isActive;
    if (countryId) where.countryId = countryId;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: subscriptionInclude,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions: subscriptions.map((row) => Subscription.fromPrisma(row)),
      total,
    };
  }

  async update(id: string, data: UpdateInput): Promise<ISubscription> {
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        countryId: data.countryId,
        name: data.name,
        email: data.email,
        passwordCiphertext: data.passwordCiphertext,
        passwordIv: data.passwordIv,
        passwordTag: data.passwordTag,
        keyVersion: data.keyVersion,
        needsCredentialReset: data.needsCredentialReset,
        maxSlots: data.maxSlots,
        expiresAt: data.expiresAt,
        renewalInfo: toInputJson(data.renewalInfo),
        userPrice: data.userPrice,
        currencyId: data.currencyId,
        metadata: toInputJson(data.metadata),
        isActive: data.isActive,
      },
      include: subscriptionInclude,
    });
    return Subscription.fromPrisma(subscription);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subscription.delete({ where: { id } });
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.SubscriptionWhereInput = { email };
    if (excludeId) where.id = { not: excludeId };
    const count = await this.prisma.subscription.count({ where });
    return count > 0;
  }

  async findByServiceProviderId(
    serviceProviderId: string
  ): Promise<ISubscription[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { serviceProviderId },
      include: subscriptionInclude,
    });
    return subscriptions.map((row) => Subscription.fromPrisma(row));
  }

  async count(): Promise<number> {
    return this.prisma.subscription.count();
  }

  async countByServiceProviderId(serviceProviderId: string): Promise<number> {
    return this.prisma.subscription.count({ where: { serviceProviderId } });
  }
}
