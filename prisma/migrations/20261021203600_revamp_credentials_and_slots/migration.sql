-- Shared credentials become reversible ciphertext. Existing bcrypt hashes cannot be recovered.
ALTER TABLE "subscriptions" ADD COLUMN "passwordCiphertext" TEXT NOT NULL DEFAULT '';
ALTER TABLE "subscriptions" ADD COLUMN "passwordIv" TEXT NOT NULL DEFAULT '';
ALTER TABLE "subscriptions" ADD COLUMN "passwordTag" TEXT NOT NULL DEFAULT '';
ALTER TABLE "subscriptions" ADD COLUMN "keyVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "subscriptions" ADD COLUMN "needsCredentialReset" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "subscriptions" ADD COLUMN "maxSlots" INTEGER;
UPDATE "subscriptions" AS s
SET "maxSlots" = s."availableSlots" + COALESCE((
  SELECT COUNT(*)::int
  FROM "subscription_slots" sl
  WHERE sl."subscriptionId" = s.id AND sl."isActive" = true
), 0);
ALTER TABLE "subscriptions" ALTER COLUMN "maxSlots" SET NOT NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "needsCredentialReset" SET DEFAULT false;

ALTER TABLE "subscriptions" DROP COLUMN "passwordHash";
ALTER TABLE "subscriptions" DROP COLUMN "availableSlots";

CREATE INDEX "subscriptions_serviceProviderId_countryId_isActive_idx"
  ON "subscriptions"("serviceProviderId", "countryId", "isActive");
CREATE INDEX "subscriptions_currencyId_idx" ON "subscriptions"("currencyId");

ALTER TABLE "subscription_slots" ADD COLUMN "releasedAt" TIMESTAMP(3);
CREATE INDEX "subscription_slots_subscriptionId_isActive_idx"
  ON "subscription_slots"("subscriptionId", "isActive");
CREATE INDEX "subscription_slots_userId_idx" ON "subscription_slots"("userId");

-- Drop dangling slot references before adding the foreign key.
UPDATE "subscription_requests"
SET "assignedSlotId" = NULL
WHERE "assignedSlotId" IS NOT NULL
  AND "assignedSlotId" NOT IN (SELECT "id" FROM "subscription_slots");

-- Keep a single request per slot if duplicates exist.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "assignedSlotId" ORDER BY "createdAt") AS rn
  FROM "subscription_requests"
  WHERE "assignedSlotId" IS NOT NULL
)
UPDATE "subscription_requests" AS r
SET "assignedSlotId" = NULL
FROM ranked
WHERE r."id" = ranked."id" AND ranked.rn > 1;

CREATE UNIQUE INDEX "subscription_requests_assignedSlotId_key"
  ON "subscription_requests"("assignedSlotId");
ALTER TABLE "subscription_requests"
  ADD CONSTRAINT "subscription_requests_assignedSlotId_fkey"
  FOREIGN KEY ("assignedSlotId") REFERENCES "subscription_slots"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "subscription_requests_userId_status_idx"
  ON "subscription_requests"("userId", "status");
CREATE INDEX "subscription_requests_serviceProviderId_countryId_status_idx"
  ON "subscription_requests"("serviceProviderId", "countryId", "status");

-- Make provider names unique, appending a short id to later duplicates.
WITH ranked AS (
  SELECT "id", "name", ROW_NUMBER() OVER (PARTITION BY "name" ORDER BY "createdAt", "id") AS rn
  FROM "service_providers"
)
UPDATE "service_providers" AS sp
SET "name" = sp."name" || '-' || LEFT(sp."id", 6)
FROM ranked
WHERE sp."id" = ranked."id" AND ranked.rn > 1;

CREATE UNIQUE INDEX "service_providers_name_key" ON "service_providers"("name");

CREATE INDEX "countries_currencyId_idx" ON "countries"("currencyId");
CREATE INDEX "service_provider_countries_countryId_idx"
  ON "service_provider_countries"("countryId");

CREATE TYPE "AuthProvider" AS ENUM ('local', 'google');
ALTER TABLE "users" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "users"
  ALTER COLUMN "provider" TYPE "AuthProvider"
  USING (
    CASE
      WHEN "provider" IS NULL THEN NULL
      WHEN "provider" IN ('local', 'google') THEN "provider"::"AuthProvider"
      ELSE 'local'::"AuthProvider"
    END
  );

-- Refresh tokens were unused and stored raw. Replace the column with a hash.
DELETE FROM "refresh_tokens";
ALTER TABLE "refresh_tokens" DROP COLUMN "token";
ALTER TABLE "refresh_tokens" ADD COLUMN "tokenHash" TEXT NOT NULL;
ALTER TABLE "refresh_tokens" ADD COLUMN "familyId" TEXT NOT NULL;
ALTER TABLE "refresh_tokens" ADD COLUMN "revokedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
