-- Provider fields used to match a verification email to an account.
ALTER TABLE "service_providers" ADD COLUMN "codeSenderDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "codePattern" TEXT;

-- Login code claims, help requests, and where a stored code came from.
CREATE TYPE "LoginCodeSource" AS ENUM ('INBOX', 'ADMIN');
CREATE TYPE "LoginCodeClaimStatus" AS ENUM ('QUEUED', 'ACTIVE', 'MATCHED', 'EXPIRED');
CREATE TYPE "LoginCodeHelpStatus" AS ENUM ('OPEN', 'RESOLVED');

ALTER TYPE "NotificationKind" ADD VALUE 'LOGIN_CODE_HELP';

ALTER TABLE "login_codes" ADD COLUMN "source" "LoginCodeSource" NOT NULL DEFAULT 'INBOX',
ADD COLUMN "claimId" TEXT;

CREATE TABLE "login_code_claims" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "status" "LoginCodeClaimStatus" NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "openAccountKey" TEXT,

    CONSTRAINT "login_code_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "login_code_help" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "claimId" TEXT,
    "status" "LoginCodeHelpStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" "LoginCodeSource",
    "resolvedByUserId" TEXT,
    "openSlotKey" TEXT,

    CONSTRAINT "login_code_help_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "login_code_claims_openAccountKey_key" ON "login_code_claims"("openAccountKey");
CREATE INDEX "login_code_claims_subscriptionId_status_openedAt_idx" ON "login_code_claims"("subscriptionId", "status", "openedAt");
CREATE INDEX "login_code_claims_status_expiresAt_idx" ON "login_code_claims"("status", "expiresAt");
CREATE INDEX "login_code_claims_slotId_status_idx" ON "login_code_claims"("slotId", "status");

CREATE UNIQUE INDEX "login_code_help_openSlotKey_key" ON "login_code_help"("openSlotKey");
CREATE INDEX "login_code_help_status_createdAt_idx" ON "login_code_help"("status", "createdAt");

ALTER TABLE "login_code_claims" ADD CONSTRAINT "login_code_claims_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "subscription_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_code_claims" ADD CONSTRAINT "login_code_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_code_claims" ADD CONSTRAINT "login_code_claims_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "login_code_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "login_code_help" ADD CONSTRAINT "login_code_help_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "subscription_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_code_help" ADD CONSTRAINT "login_code_help_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_code_help" ADD CONSTRAINT "login_code_help_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "login_code_help" ADD CONSTRAINT "login_code_help_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "login_code_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
