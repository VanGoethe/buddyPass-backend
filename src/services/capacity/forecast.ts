/**
 * Pure capacity forecast for one service-provider and country pool.
 * Alerting follows the last allocatable account, not a fixed seat count.
 */

export const FORECAST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const FORECAST_RECENT_ASSIGNMENT_LIMIT = 20;

const HOUR_MS = 60 * 60 * 1000;

export interface ForecastAccount {
  id: string;
  maxSlots: number;
  occupied: number;
  createdAt: Date;
  slotAssignedAts: Date[];
}

export interface ForecastInput {
  now: Date;
  allocatable: ForecastAccount[];
  history: ForecastAccount[];
  pendingCount: number;
  assignmentTimes: Date[];
}

export interface CapacityForecast {
  shouldAlert: boolean;
  headroom: number;
  pendingCount: number;
  packingSubscriptionId: string | null;
  recentRatePerHour: number | null;
  historicalFillMs: number | null;
  etaMs: number | null;
  horizonMs: number | null;
}

export function poolKeyFor(
  serviceProviderId: string,
  countryId?: string | null
): string {
  return `${serviceProviderId}:${countryId ?? "none"}`;
}

/**
 * Pending requests with no country can be seated on any account for the provider.
 * A country pool therefore counts its own pending requests and those unscoped ones.
 * The null-country pool counts only unscoped requests.
 */
export function countPendingForPool(
  poolCountryId: string | null,
  requests: ReadonlyArray<{ countryId: string | null }>
): number {
  if (poolCountryId === null) {
    return requests.filter((request) => request.countryId === null).length;
  }
  return requests.filter(
    (request) =>
      request.countryId === poolCountryId || request.countryId === null
  ).length;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function timeToFirstFull(account: ForecastAccount): number | null {
  if (account.maxSlots < 1) {
    return null;
  }
  const times = account.slotAssignedAts
    .map((value) => value.getTime())
    .sort((left, right) => left - right);
  if (times.length < account.maxSlots) {
    return null;
  }
  return times[account.maxSlots - 1] - times[0];
}

function recentRatePerHour(now: Date, assignmentTimes: Date[]): number | null {
  const sorted = assignmentTimes
    .map((value) => value.getTime())
    .sort((left, right) => left - right);
  if (sorted.length < 2) {
    return null;
  }

  const windowStart = now.getTime() - FORECAST_WINDOW_MS;
  const last20 = sorted.slice(-FORECAST_RECENT_ASSIGNMENT_LIMIT);
  const last20Span = last20[last20.length - 1] - last20[0];
  const newest = last20[last20.length - 1];
  const inWindow = sorted.filter((time) => time >= windowStart);
  const useLast20 =
    last20.length >= 2 &&
    last20Span > 0 &&
    last20Span < FORECAST_WINDOW_MS &&
    newest >= windowStart;
  const sample = useLast20 ? last20 : inWindow;

  if (sample.length < 2) {
    return null;
  }
  const span = sample[sample.length - 1] - sample[0];
  if (span <= 0) {
    return null;
  }
  return sample.length / (span / HOUR_MS);
}

function selectPackingAccount(
  allocatable: ForecastAccount[]
): ForecastAccount | undefined {
  return allocatable
    .filter((account) => account.occupied < account.maxSlots)
    .sort(
      (left, right) =>
        right.occupied - left.occupied ||
        left.createdAt.getTime() - right.createdAt.getTime()
    )[0];
}

export function forecastPool(input: ForecastInput): CapacityForecast {
  const pendingCount = input.pendingCount;
  const freeSeats = input.allocatable.reduce(
    (sum, account) => sum + Math.max(0, account.maxSlots - account.occupied),
    0
  );
  const headroom = freeSeats - pendingCount;
  const hasOccupied = input.allocatable.some((account) => account.occupied > 0);
  const hasEmptySpare = input.allocatable.some(
    (account) => account.occupied === 0
  );
  const hasDemand = hasOccupied || pendingCount > 0;
  const lastAccountFilling = hasDemand && hasOccupied && !hasEmptySpare;
  const shouldAlert = hasDemand && (lastAccountFilling || headroom <= 0);

  const packing = selectPackingAccount(input.allocatable);
  const completed = input.history
    .map((account) => ({
      maxSlots: account.maxSlots,
      fillMs: timeToFirstFull(account),
    }))
    .filter(
      (row): row is { maxSlots: number; fillMs: number } => row.fillMs !== null
    );

  const historicalFillMs =
    completed.length >= 2 ? median(completed.map((row) => row.fillMs)) : null;
  const typicalMaxSlots =
    completed.length >= 2 ? median(completed.map((row) => row.maxSlots)) : null;
  const recentRate = recentRatePerHour(input.now, input.assignmentTimes);

  const rateEtaMs =
    recentRate !== null && recentRate > 0
      ? (headroom / recentRate) * HOUR_MS
      : null;
  const historyEtaMs =
    historicalFillMs !== null &&
    typicalMaxSlots !== null &&
    typicalMaxSlots > 0
      ? historicalFillMs * (headroom / typicalMaxSlots)
      : null;

  let etaMs: number | null = null;
  if (rateEtaMs !== null && historyEtaMs !== null) {
    etaMs = Math.min(rateEtaMs, historyEtaMs);
  } else {
    etaMs = rateEtaMs ?? historyEtaMs;
  }

  let horizonMs: number | null = null;
  if (historicalFillMs !== null) {
    horizonMs = historicalFillMs;
  } else if (recentRate !== null && recentRate > 0 && packing) {
    horizonMs = (packing.maxSlots / recentRate) * HOUR_MS;
  }

  return {
    shouldAlert,
    headroom,
    pendingCount,
    packingSubscriptionId: packing?.id ?? null,
    recentRatePerHour: recentRate,
    historicalFillMs:
      historicalFillMs === null ? null : Math.round(historicalFillMs),
    etaMs: etaMs === null ? null : Math.round(etaMs),
    horizonMs: horizonMs === null ? null : Math.round(horizonMs),
  };
}
