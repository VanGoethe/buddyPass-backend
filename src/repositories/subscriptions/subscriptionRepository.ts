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
        accountCost: data.accountCost,
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
        accountCost: data.accountCost,
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

  async inventoryByService() {
    const rows = await this.prisma.subscription.findMany({
      include: {
        serviceProvider: { select: { id: true, name: true } },
        _count: {
          select: {
            subscriptionSlots: { where: { isActive: true, releasedAt: null } },
          },
        },
      },
    });
    const grouped = new Map<
      string,
      { serviceProviderId: string; serviceProviderName: string; total: number; taken: number }
    >();
    for (const row of rows) {
      const current = grouped.get(row.serviceProviderId) ?? {
        serviceProviderId: row.serviceProviderId,
        serviceProviderName: row.serviceProvider.name,
        total: 0,
        taken: 0,
      };
      current.total += row.maxSlots;
      current.taken += row._count.subscriptionSlots;
      grouped.set(row.serviceProviderId, current);
    }
    return [...grouped.values()].map((row) => ({
      ...row,
      free: Math.max(row.total - row.taken, 0),
    }));
  }

  async listExpiringAccounts(withinDays: number) {
    const now = new Date();
    const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.subscription.findMany({
      where: { isActive: true, expiresAt: { gt: now, lte: until } },
      include: { serviceProvider: { select: { name: true } } },
      orderBy: { expiresAt: "asc" },
    });
    return rows.flatMap((row) =>
      row.expiresAt
        ? [
            {
              id: row.id,
              name: row.name,
              serviceProviderName: row.serviceProvider.name,
              expiresAt: row.expiresAt.toISOString(),
            },
          ]
        : []
    );
  }

  async listOfferAccounts() {
    const now = new Date();
    const rows = await this.prisma.subscription.findMany({
      where: { isActive: true, userPrice: { not: null } },
      include: {
        serviceProvider: { select: { name: true, iconUrl: true, description: true } },
        country: { select: { name: true } },
        currency: { select: { code: true } },
        _count: {
          select: {
            subscriptionSlots: { where: { isActive: true, releasedAt: null } },
          },
        },
      },
    });
    return rows.map((row) => ({
      serviceProviderId: row.serviceProviderId,
      serviceProviderName: row.serviceProvider.name,
      iconUrl: row.serviceProvider.iconUrl,
      description: row.serviceProvider.description,
      countryId: row.countryId,
      countryName: row.country?.name ?? null,
      currencyCode: row.currency?.code ?? null,
      userPrice: row.userPrice,
      maxSlots: row.maxSlots,
      occupied: row._count.subscriptionSlots,
      allocatable:
        row.isActive &&
        !row.needsCredentialReset &&
        (row.expiresAt === null || row.expiresAt > now),
    }));
  }
}
