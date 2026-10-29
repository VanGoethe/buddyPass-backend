/**
 * Customer term dates. Months are calendar months in UTC, clamped to the
 * last day of the target month (31 January becomes 28 or 29 February).
 */

export function addOneCalendarMonth(from: Date): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  return new Date(
    Date.UTC(
      year,
      month + 1,
      clampedDay,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds()
    )
  );
}

export interface CustomerTerm {
  termStartsAt: Date;
  termEndsAt: Date;
}

/**
 * A payment before the current month ends extends that month.
 * A first payment, or a payment while the seat is blocked, starts a new month.
 */
export function nextCustomerTerm(
  access: "AWAITING_PAYMENT" | "ACTIVE" | "BLOCKED",
  termStartsAt: Date | null,
  termEndsAt: Date | null,
  paidAt: Date
): CustomerTerm {
  if (access === "ACTIVE" && termEndsAt && termEndsAt.getTime() > paidAt.getTime()) {
    return {
      termStartsAt: termStartsAt ?? paidAt,
      termEndsAt: addOneCalendarMonth(termEndsAt),
    };
  }
  return {
    termStartsAt: paidAt,
    termEndsAt: addOneCalendarMonth(paidAt),
  };
}
