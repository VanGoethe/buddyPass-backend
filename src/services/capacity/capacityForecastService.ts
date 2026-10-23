import { PrismaClient } from "@prisma/client";
import {
  PrismaCapacityAlertRepository,
  PoolSubscriptionRow,
} from "../../repositories/capacity/capacityAlertRepository";
import {
  CapacityAlertView,
  ICapacityForecastService,
  OpenCapacityAlertSummary,
} from "../../types/capacity";
import { logger } from "../../utils/logger";
import {
  CapacityForecast,
  ForecastAccount,
  countPendingForPool,
  forecastPool,
  poolKeyFor,
} from "./forecast";

const DASHBOARD_ALERT_LIMIT = 10;

function toAccount(row: PoolSubscriptionRow): ForecastAccount {
  return {
    id: row.id,
    maxSlots: row.maxSlots,
    occupied: row.slots.filter((slot) => slot.isActive && slot.releasedAt === null)
      .length,
    createdAt: row.createdAt,
    slotAssignedAts: row.slots.map((slot) => slot.assignedAt),
  };
}

function isAllocatable(row: PoolSubscriptionRow, now: Date): boolean {
  return (
    row.isActive &&
    !row.needsCredentialReset &&
    (row.expiresAt === null || row.expiresAt > now)
  );
}

export class CapacityForecastService implements ICapacityForecastService {
  private repository: PrismaCapacityAlertRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new PrismaCapacityAlertRepository(prisma);
  }

  async recompute(
    serviceProviderId: string,
    countryId?: string | null
  ): Promise<void> {
    const poolCountryId = countryId ?? null;
    const now = new Date();
    const [subscriptions, pending] = await Promise.all([
      this.repository.loadSubscriptions(serviceProviderId, poolCountryId),
      this.repository.listPendingCountries(serviceProviderId),
    ]);
    const accounts = subscriptions.map(toAccount);
    const forecast = forecastPool({
      now,
      allocatable: subscriptions
        .filter((row) => isAllocatable(row, now))
        .map(toAccount),
      history: accounts,
      pendingCount: countPendingForPool(poolCountryId, pending),
      assignmentTimes: accounts.flatMap((account) => account.slotAssignedAts),
    });
    const poolKey = poolKeyFor(serviceProviderId, poolCountryId);
    const write = {
      serviceProviderId,
      countryId: poolCountryId,
      headroom: forecast.headroom,
      pendingCount: forecast.pendingCount,
      packingSubscriptionId: forecast.packingSubscriptionId,
      recentRatePerHour: forecast.recentRatePerHour,
      historicalFillMs: forecast.historicalFillMs,
      etaMs: forecast.etaMs,
      horizonMs: forecast.horizonMs,
    };

    if (!forecast.shouldAlert) {
      await this.repository.resolveOpen(poolKey, write);
      return;
    }

    const outcome = await this.repository.upsertOpen(poolKey, write);
    if (outcome === "opened") {
      this.logOpened(serviceProviderId, poolCountryId, forecast);
    }
  }

  async recomputeProvider(serviceProviderId: string): Promise<void> {
    const countries =
      await this.repository.listProviderPoolCountries(serviceProviderId);
    const targets = countries.length > 0 ? countries : [null];
    for (const countryId of targets) {
      await this.recompute(serviceProviderId, countryId);
    }
  }

  async recomputeActivePools(): Promise<void> {
    const pools = await this.repository.listActivePools();
    for (const pool of pools) {
      try {
        await this.recompute(pool.serviceProviderId, pool.countryId);
      } catch (error) {
        logger.error(
          {
            err: error,
            serviceProviderId: pool.serviceProviderId,
            countryId: pool.countryId,
          },
          "Capacity forecast recompute failed"
        );
      }
    }
  }

  async listOpenAlerts(): Promise<CapacityAlertView[]> {
    return this.repository.listOpen();
  }

  async getOpenAlertSummary(
    limit: number = DASHBOARD_ALERT_LIMIT
  ): Promise<OpenCapacityAlertSummary> {
    const [count, alerts] = await Promise.all([
      this.repository.countOpen(),
      this.repository.listOpen(),
    ]);
    return { count, alerts: alerts.slice(0, limit) };
  }

  private logOpened(
    serviceProviderId: string,
    countryId: string | null,
    forecast: CapacityForecast
  ): void {
    logger.warn(
      {
        serviceProviderId,
        countryId,
        headroom: forecast.headroom,
        pendingCount: forecast.pendingCount,
        etaMs: forecast.etaMs,
        horizonMs: forecast.horizonMs,
        packingSubscriptionId: forecast.packingSubscriptionId,
      },
      "Capacity alert opened"
    );
  }
}
