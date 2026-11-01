-- One open capacity alert per provider-and-country pool.
-- openPoolKey is set only while OPEN so resolved rows can repeat the pool.

CREATE TYPE "CapacityAlertStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "capacity_alerts" (
    "id" TEXT NOT NULL,
    "serviceProviderId" TEXT NOT NULL,
    "countryId" TEXT,
    "poolKey" TEXT NOT NULL,
    "openPoolKey" TEXT,
    "status" "CapacityAlertStatus" NOT NULL DEFAULT 'OPEN',
    "headroom" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "packingSubscriptionId" TEXT,
    "recentRatePerHour" DOUBLE PRECISION,
    "historicalFillMs" BIGINT,
    "etaMs" BIGINT,
    "horizonMs" BIGINT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_alerts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "capacity_alerts_openPoolKey_key" ON "capacity_alerts"("openPoolKey");
CREATE INDEX "capacity_alerts_status_openedAt_idx" ON "capacity_alerts"("status", "openedAt");
CREATE INDEX "capacity_alerts_serviceProviderId_idx" ON "capacity_alerts"("serviceProviderId");

ALTER TABLE "capacity_alerts" ADD CONSTRAINT "capacity_alerts_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capacity_alerts" ADD CONSTRAINT "capacity_alerts_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capacity_alerts" ADD CONSTRAINT "capacity_alerts_packingSubscriptionId_fkey" FOREIGN KEY ("packingSubscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
