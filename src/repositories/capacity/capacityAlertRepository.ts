import { Prisma, PrismaClient } from "@prisma/client";
import { CapacityAlertView } from "../../types/capacity";

export interface PoolSubscriptionRow {
  id: string;
  maxSlots: number;
  isActive: boolean;
  needsCredentialReset: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  slots: Array<{
    assignedAt: Date;
    isActive: boolean;
    releasedAt: Date | null;
  }>;
}

export interface CapacityPoolRef {
  serviceProviderId: string;
  countryId: string | null;
}

export interface CapacityAlertWrite {
  serviceProviderId: string;
  countryId: string | null;
  headroom: number;
  pendingCount: number;
  packingSubscriptionId: string | null;
  recentRatePerHour: number | null;
  historicalFillMs: number | null;
  etaMs: number | null;
  horizonMs: number | null;
}

const alertInclude = {
  serviceProvider: { select: { name: true } },
  country: { select: { name: true } },
} satisfies Prisma.CapacityAlertInclude;

type AlertRecord = Prisma.CapacityAlertGetPayload<{ include: typeof alertInclude }>;

function toBigInt(value: number | null): bigint | null {
  if (value === null) {
    return null;
  }
  return BigInt(Math.round(value));
}

function toNumber(value: bigint | null): number | null {
  if (value === null) {
    return null;
  }
  return Number(value);
}

function toView(row: AlertRecord): CapacityAlertView {
  return {
    id: row.id,
    serviceProviderId: row.serviceProviderId,
    serviceProviderName: row.serviceProvider.name,
    countryId: row.countryId,
    countryName: row.country?.name ?? null,
    packingSubscriptionId: row.packingSubscriptionId,
    headroom: row.headroom,
    pendingCount: row.pendingCount,
    recentRatePerHour: row.recentRatePerHour,
    historicalFillMs: toNumber(row.historicalFillMs),
    etaMs: toNumber(row.etaMs),
    horizonMs: toNumber(row.horizonMs),
    openedAt: row.openedAt,
    updatedAt: row.updatedAt,
  };
}

function snapshot(
  data: CapacityAlertWrite
): Prisma.CapacityAlertUncheckedUpdateInput {
  return {
    headroom: data.headroom,
    pendingCount: data.pendingCount,
    packingSubscriptionId: data.packingSubscriptionId,
    recentRatePerHour: data.recentRatePerHour,
    historicalFillMs: toBigInt(data.historicalFillMs),
    etaMs: toBigInt(data.etaMs),
    horizonMs: toBigInt(data.horizonMs),
  };
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export class PrismaCapacityAlertRepository {
  constructor(private prisma: PrismaClient) {}

  async loadSubscriptions(
    serviceProviderId: string,
    countryId: string | null
  ): Promise<PoolSubscriptionRow[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { serviceProviderId, countryId },
      select: {
        id: true,
        maxSlots: true,
        isActive: true,
        needsCredentialReset: true,
        expiresAt: true,
        createdAt: true,
        subscriptionSlots: {
          select: { assignedAt: true, isActive: true, releasedAt: true },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      maxSlots: row.maxSlots,
      isActive: row.isActive,
      needsCredentialReset: row.needsCredentialReset,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      slots: row.subscriptionSlots,
    }));
  }

  async listPendingCountries(
    serviceProviderId: string
  ): Promise<Array<{ countryId: string | null }>> {
    return this.prisma.subscriptionRequest.findMany({
      where: { serviceProviderId, status: "PENDING" },
      select: { countryId: true },
    });
  }

  async listProviderPoolCountries(
    serviceProviderId: string
  ): Promise<Array<string | null>> {
    const [subscriptions, alerts, pending] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { serviceProviderId },
        select: { countryId: true },
        distinct: ["countryId"],
      }),
      this.prisma.capacityAlert.findMany({
        where: { serviceProviderId, status: "OPEN" },
        select: { countryId: true },
      }),
      this.prisma.subscriptionRequest.findMany({
        where: { serviceProviderId, status: "PENDING" },
        select: { countryId: true },
        distinct: ["countryId"],
      }),
    ]);
    const countries = new Set<string | null>();
    for (const row of subscriptions) countries.add(row.countryId);
    for (const row of alerts) countries.add(row.countryId);
    for (const row of pending) countries.add(row.countryId);
    return [...countries];
  }

  async listActivePools(): Promise<CapacityPoolRef[]> {
    const [alerts, pending, busy, nullPendingProviders] = await Promise.all([
      this.prisma.capacityAlert.findMany({
        where: { status: "OPEN" },
        select: { serviceProviderId: true, countryId: true },
      }),
      this.prisma.subscriptionRequest.findMany({
        where: { status: "PENDING" },
        select: { serviceProviderId: true, countryId: true },
        distinct: ["serviceProviderId", "countryId"],
      }),
      this.prisma.subscription.findMany({
        where: {
          subscriptionSlots: { some: { isActive: true, releasedAt: null } },
        },
        select: { serviceProviderId: true, countryId: true },
        distinct: ["serviceProviderId", "countryId"],
      }),
      this.prisma.subscriptionRequest.findMany({
        where: { status: "PENDING", countryId: null },
        select: { serviceProviderId: true },
        distinct: ["serviceProviderId"],
      }),
    ]);

    const pools = new Map<string, CapacityPoolRef>();
    const add = (serviceProviderId: string, countryId: string | null): void => {
      pools.set(`${serviceProviderId}:${countryId ?? "none"}`, {
        serviceProviderId,
        countryId,
      });
    };

    for (const row of alerts) add(row.serviceProviderId, row.countryId);
    for (const row of pending) add(row.serviceProviderId, row.countryId);
    for (const row of busy) add(row.serviceProviderId, row.countryId);

    if (nullPendingProviders.length > 0) {
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          serviceProviderId: {
            in: nullPendingProviders.map((row) => row.serviceProviderId),
          },
        },
        select: { serviceProviderId: true, countryId: true },
        distinct: ["serviceProviderId", "countryId"],
      });
      for (const row of subscriptions) {
        add(row.serviceProviderId, row.countryId);
      }
    }

    return [...pools.values()];
  }

  async upsertOpen(poolKey: string, data: CapacityAlertWrite): Promise<"opened" | "refreshed"> {
    const existing = await this.prisma.capacityAlert.findUnique({
      where: { openPoolKey: poolKey },
    });
    const next = snapshot(data);
    if (existing) {
      await this.prisma.capacityAlert.update({
        where: { id: existing.id },
        data: next,
      });
      return "refreshed";
    }

    try {
      await this.prisma.capacityAlert.create({
        data: {
          serviceProviderId: data.serviceProviderId,
          countryId: data.countryId,
          poolKey,
          openPoolKey: poolKey,
          status: "OPEN",
          headroom: data.headroom,
          pendingCount: data.pendingCount,
          packingSubscriptionId: data.packingSubscriptionId,
          recentRatePerHour: data.recentRatePerHour,
          historicalFillMs: toBigInt(data.historicalFillMs),
          etaMs: toBigInt(data.etaMs),
          horizonMs: toBigInt(data.horizonMs),
        },
      });
      return "opened";
    } catch (error) {
      if (!isUniqueConflict(error)) {
        throw error;
      }
      const winner = await this.prisma.capacityAlert.findUnique({
        where: { openPoolKey: poolKey },
      });
      if (!winner) {
        throw error;
      }
      await this.prisma.capacityAlert.update({
        where: { id: winner.id },
        data: next,
      });
      return "refreshed";
    }
  }

  async resolveOpen(poolKey: string, data: CapacityAlertWrite): Promise<boolean> {
    const existing = await this.prisma.capacityAlert.findUnique({
      where: { openPoolKey: poolKey },
    });
    if (!existing) {
      return false;
    }
    await this.prisma.capacityAlert.update({
      where: { id: existing.id },
      data: {
        ...snapshot(data),
        status: "RESOLVED",
        resolvedAt: new Date(),
        openPoolKey: null,
      },
    });
    return true;
  }

  async listOpen(): Promise<CapacityAlertView[]> {
    const rows = await this.prisma.capacityAlert.findMany({
      where: { status: "OPEN" },
      include: alertInclude,
      orderBy: { openedAt: "desc" },
    });
    return rows.map(toView);
  }

  async countOpen(): Promise<number> {
    return this.prisma.capacityAlert.count({ where: { status: "OPEN" } });
  }
}
