import { PaymentMethod, PaymentVerification, Prisma } from "@prisma/client";

export interface PaymentChoice {
  verification: PaymentVerification;
  method: PaymentMethod | null;
}

/**
 * Manual is one choice. Online choices are distinct per gateway.
 * A second start of the same choice returns the pending row.
 */
export function isSamePaymentChoice(pending: PaymentChoice, next: PaymentChoice): boolean {
  if (pending.verification !== next.verification) {
    return false;
  }
  if (pending.verification === "MANUAL") {
    return true;
  }
  return pending.method === next.method;
}

/** An Ihella charge that already left BuddyPass must not be replaced. */
export function ihellaChargeIsOpen(
  pending: PaymentChoice & { providerRef: string | null }
): boolean {
  return (
    pending.verification === "ONLINE" &&
    pending.method === "IHELLA" &&
    typeof pending.providerRef === "string" &&
    pending.providerRef.length > 0
  );
}

/** A person still has to confirm this payment. A created Ihella charge does not. */
export function paymentWaitsForAdmin(
  payment: PaymentChoice & { status: string; providerRef: string | null }
): boolean {
  if (payment.status !== "PENDING") {
    return false;
  }
  if (payment.verification === "MANUAL") {
    return true;
  }
  if (payment.method === "LUMICASH" || payment.method === "ENOTI") {
    return true;
  }
  return payment.method === "IHELLA" && payment.providerRef === null;
}

export function waitsForAdminWhere(): Prisma.PaymentWhereInput {
  return {
    status: "PENDING",
    OR: [
      { verification: "MANUAL" },
      { method: { in: ["LUMICASH", "ENOTI"] } },
      { method: "IHELLA", providerRef: null },
    ],
  };
}
