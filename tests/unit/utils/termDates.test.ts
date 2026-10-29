import { addOneCalendarMonth, nextCustomerTerm } from "../../../src/utils/termDates";

describe("customer term dates", () => {
  it("clamps 31 January to the last day of February", () => {
    const end = addOneCalendarMonth(new Date(Date.UTC(2026, 0, 31, 15, 0, 0)));
    expect(end.toISOString()).toBe("2026-02-28T15:00:00.000Z");
  });

  it("keeps 31 January through a leap-year February", () => {
    const end = addOneCalendarMonth(new Date(Date.UTC(2028, 0, 31)));
    expect(end.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("extends an active term from the current end", () => {
    const paidAt = new Date(Date.UTC(2026, 10, 10));
    const termEndsAt = new Date(Date.UTC(2026, 10, 20));
    const term = nextCustomerTerm(
      "ACTIVE",
      new Date(Date.UTC(2026, 9, 20)),
      termEndsAt,
      paidAt
    );
    expect(term.termStartsAt.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(term.termEndsAt.toISOString()).toBe("2026-12-20T00:00:00.000Z");
  });

  it("starts a new month when the seat is blocked", () => {
    const paidAt = new Date(Date.UTC(2026, 11, 20, 8));
    const term = nextCustomerTerm(
      "BLOCKED",
      new Date(Date.UTC(2026, 10, 20)),
      new Date(Date.UTC(2026, 11, 20)),
      paidAt
    );
    expect(term.termStartsAt.toISOString()).toBe(paidAt.toISOString());
    expect(term.termEndsAt.toISOString()).toBe("2027-01-20T08:00:00.000Z");
  });
});
