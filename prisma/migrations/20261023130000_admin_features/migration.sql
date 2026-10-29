-- Catalog
ALTER TABLE "service_providers" ADD COLUMN "iconUrl" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "accountCost" DECIMAL(65,30);

-- Seat term
CREATE TYPE "SlotAccess" AS ENUM ('AWAITING_PAYMENT', 'ACTIVE', 'BLOCKED');

ALTER TABLE "subscription_slots" ADD COLUMN "access" "SlotAccess" NOT NULL DEFAULT 'AWAITING_PAYMENT';
ALTER TABLE "subscription_slots" ADD COLUMN "termStartsAt" TIMESTAMP(3);
ALTER TABLE "subscription_slots" ADD COLUMN "termEndsAt" TIMESTAMP(3);
ALTER TABLE "subscription_slots" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "subscription_slots" ADD COLUMN "aliasLocalPart" TEXT;

UPDATE "subscription_slots"
SET
  "access" = 'ACTIVE',
  "termStartsAt" = "assignedAt",
  "termEndsAt" = "assignedAt" + INTERVAL '1 month'
WHERE "isActive" = true AND "releasedAt" IS NULL;

UPDATE "subscription_slots"
SET "aliasLocalPart" = 'seat' || "id"
WHERE "aliasLocalPart" IS NULL;

ALTER TABLE "subscription_slots" ALTER COLUMN "aliasLocalPart" SET NOT NULL;
CREATE UNIQUE INDEX "subscription_slots_aliasLocalPart_key" ON "subscription_slots"("aliasLocalPart");

DROP INDEX IF EXISTS "subscription_slots_userId_subscriptionId_key";
CREATE UNIQUE INDEX "subscription_slots_one_active_stay"
  ON "subscription_slots" ("userId", "subscriptionId")
  WHERE "isActive" = true AND "releasedAt" IS NULL;

CREATE INDEX "subscription_slots_access_termEndsAt_idx" ON "subscription_slots"("access", "termEndsAt");
CREATE INDEX "subscription_slots_access_assignedAt_idx" ON "subscription_slots"("access", "assignedAt");

-- Reveal history
CREATE TABLE "credential_reveals" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credential_reveals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "credential_reveals_subscriptionId_createdAt_idx" ON "credential_reveals"("subscriptionId", "createdAt");
ALTER TABLE "credential_reveals" ADD CONSTRAINT "credential_reveals_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credential_reveals" ADD CONSTRAINT "credential_reveals_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "subscription_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credential_reveals" ADD CONSTRAINT "credential_reveals_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Login codes
CREATE TABLE "login_codes" (
  "id" TEXT NOT NULL,
  "slotId" TEXT,
  "alias" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_codes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_codes_slotId_receivedAt_idx" ON "login_codes"("slotId", "receivedAt");
CREATE INDEX "login_codes_receivedAt_idx" ON "login_codes"("receivedAt");
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "subscription_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Incidents
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TABLE "login_incidents" (
  "id" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "login_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_incidents_subscriptionId_status_idx" ON "login_incidents"("subscriptionId", "status");
CREATE INDEX "login_incidents_slotId_idx" ON "login_incidents"("slotId");
ALTER TABLE "login_incidents" ADD CONSTRAINT "login_incidents_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "subscription_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_incidents" ADD CONSTRAINT "login_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_incidents" ADD CONSTRAINT "login_incidents_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notifications
CREATE TYPE "NotificationKind" AS ENUM ('PROVIDER_EXPIRY', 'SEAT_EXPIRY', 'SEAT_CHANGE', 'PAYMENT_CONFIRMATION');
CREATE TYPE "NotificationStage" AS ENUM ('NONE', 'WEEK', 'DAY');
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "body" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "slotId" TEXT,
  "paymentId" TEXT,
  "stage" "NotificationStage" NOT NULL DEFAULT 'NONE',
  "dedupeKey" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON "notifications"("dedupeKey");
CREATE INDEX "notifications_recipientUserId_createdAt_idx" ON "notifications"("recipientUserId", "createdAt");
CREATE INDEX "notifications_kind_createdAt_idx" ON "notifications"("kind", "createdAt");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payments
CREATE TYPE "PaymentMethod" AS ENUM ('IHELLA', 'LUMICASH', 'ENOTI');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currencyId" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" TEXT,
  "paidAt" TIMESTAMP(3),
  "settledAfterRelease" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_providerRef_key" ON "payments"("providerRef");
CREATE INDEX "payments_slotId_status_idx" ON "payments"("slotId", "status");
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "subscription_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
