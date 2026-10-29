export interface CapacityWaiter {
  userId: string;
  name: string | null;
  requestedAt: string;
  place: number;
}

export interface CapacityAlertView {
  id: string;
  serviceProviderId: string;
  serviceProviderName: string;
  countryId: string | null;
  countryName: string | null;
  packingSubscriptionId: string | null;
  headroom: number;
  pendingCount: number;
  freeSeats: number;
  waiting: CapacityWaiter[];
  recentRatePerHour: number | null;
  historicalFillMs: number | null;
  etaMs: number | null;
  horizonMs: number | null;
  openedAt: Date;
  updatedAt: Date;
}

export interface OpenCapacityAlertSummary {
  count: number;
  alerts: CapacityAlertView[];
}

export interface ICapacityForecastService {
  recompute(
    serviceProviderId: string,
    countryId?: string | null
  ): Promise<void>;
  recomputeProvider(serviceProviderId: string): Promise<void>;
  recomputeActivePools(): Promise<void>;
  listOpenAlerts(): Promise<CapacityAlertView[]>;
  getOpenAlertSummary(limit?: number): Promise<OpenCapacityAlertSummary>;
}
