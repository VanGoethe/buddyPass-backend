-- Customer choice: person-to-person verification, or an online gateway.
CREATE TYPE "PaymentVerification" AS ENUM ('MANUAL', 'ONLINE');

ALTER TABLE "payments" ADD COLUMN "verification" "PaymentVerification" NOT NULL DEFAULT 'ONLINE';
ALTER TABLE "payments" ADD COLUMN "confirmationNote" TEXT;
ALTER TABLE "payments" ALTER COLUMN "method" DROP NOT NULL;

CREATE INDEX "payments_verification_status_idx" ON "payments"("verification", "status");

-- Existing rows stay online gateway payments.
ALTER TYPE "NotificationKind" ADD VALUE 'PAYMENT_TO_VERIFY';
