import {
  countPendingForPool,
  forecastPool,
  ForecastAccount,
  ForecastInput,
  poolKeyFor,
} from "../../../src/services/capacity/forecast";

const NOW = new Date("2026-10-21T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function account(overrides: Partial<ForecastAccount> = {}): ForecastAccount {
  return {
    id: "sub-open",
    maxSlots: 5,
    occupied: 0,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    slotAssignedAts: [],
    ...overrides,
  };
}

function input(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    now: NOW,
    allocatable: [],
    history: [],
    pendingCount: 0,
    assignmentTimes: [],
    ...overrides,
  };
}

describe("capacity forecast", () => {
  it("alerts when the last allocatable account takes its first seat", () => {
    const result = forecastPool(
      input({
        allocatable: [account({ occupied: 1, slotAssignedAts: [NOW] })],
        assignmentTimes: [NOW],
      })
    );

    expect(result.shouldAlert).toBe(true);
    expect(result.headroom).toBe(4);
    expect(result.packingSubscriptionId).toBe("sub-open");
    expect(result.recentRatePerHour).toBeNull();
    expect(result.etaMs).toBeNull();
  });

  it("stays quiet while an empty spare account exists", () => {
    const result = forecastPool(
      input({
        allocatable: [
          account({ id: "filling", occupied: 4, maxSlots: 5 }),
          account({
            id: "spare",
            occupied: 0,
            maxSlots: 5,
            createdAt: new Date("2026-10-02T00:00:00.000Z"),
          }),
        ],
      })
    );

    expect(result.shouldAlert).toBe(false);
    expect(result.headroom).toBe(6);
    expect(result.packingSubscriptionId).toBe("filling");
  });

  it("alerts when pending requests already exceed free seats", () => {
    const result = forecastPool(
      input({
        allocatable: [account({ id: "full", occupied: 5, maxSlots: 5 })],
        pendingCount: 3,
      })
    );

    expect(result.shouldAlert).toBe(true);
    expect(result.headroom).toBe(-3);
    expect(result.packingSubscriptionId).toBeNull();
  });

  it("alerts when an empty spare is too small for the pending queue", () => {
    const result = forecastPool(
      input({
        allocatable: [account({ occupied: 0, maxSlots: 2 })],
        pendingCount: 3,
      })
    );

    expect(result.shouldAlert).toBe(true);
    expect(result.headroom).toBe(-1);
  });

  it("stays quiet when a new pool has no seats taken and no pending requests", () => {
    const result = forecastPool(
      input({ allocatable: [account({ occupied: 0, maxSlots: 5 })] })
    );

    expect(result.shouldAlert).toBe(false);
  });

  it("uses two recent assignments for the hourly pace", () => {
    const earlier = new Date(NOW.getTime() - 2 * HOUR_MS);
    const result = forecastPool(
      input({
        allocatable: [
          account({ occupied: 2, slotAssignedAts: [earlier, NOW] }),
        ],
        assignmentTimes: [earlier, NOW],
      })
    );

    expect(result.recentRatePerHour).toBeCloseTo(1);
    expect(result.etaMs).toBe(3 * HOUR_MS);
    expect(result.horizonMs).toBe(5 * HOUR_MS);
  });

  it("ignores a pace built from assignments older than seven days", () => {
    const older = new Date(NOW.getTime() - 8 * DAY_MS);
    const result = forecastPool(
      input({
        allocatable: [account({ occupied: 2 })],
        assignmentTimes: [older, NOW],
      })
    );

    expect(result.recentRatePerHour).toBeNull();
  });

  it("uses the median time-to-first-full once two accounts have filled", () => {
    const start = new Date("2026-09-01T00:00:00.000Z");
    const filled = (id: string, hours: number): ForecastAccount =>
      account({
        id,
        maxSlots: 2,
        occupied: 0,
        slotAssignedAts: [start, new Date(start.getTime() + hours * HOUR_MS)],
      });
    const result = forecastPool(
      input({
        allocatable: [account({ occupied: 1, maxSlots: 5 })],
        history: [filled("past-a", 2), filled("past-b", 4), account({ id: "partial", maxSlots: 3, slotAssignedAts: [start] })],
      })
    );

    expect(result.historicalFillMs).toBe(3 * HOUR_MS);
    expect(result.horizonMs).toBe(3 * HOUR_MS);
    expect(result.etaMs).toBe(6 * HOUR_MS);
  });

  it("does not trust a fill time until a second account has filled", () => {
    const start = new Date("2026-09-01T00:00:00.000Z");
    const result = forecastPool(
      input({
        history: [
          account({
            id: "only",
            maxSlots: 2,
            slotAssignedAts: [start, new Date(start.getTime() + 2 * HOUR_MS)],
          }),
        ],
        allocatable: [account({ occupied: 1 })],
      })
    );

    expect(result.historicalFillMs).toBeNull();
    expect(result.horizonMs).toBeNull();
  });

  it("shows the faster of recent pace and historical fill time", () => {
    const start = new Date("2026-09-01T00:00:00.000Z");
    const fortyEightHours = 48 * HOUR_MS;
    const filled = (id: string): ForecastAccount =>
      account({
        id,
        maxSlots: 2,
        slotAssignedAts: [start, new Date(start.getTime() + fortyEightHours)],
      });
    const recent = new Date(NOW.getTime() - 6 * 60 * 1000);
    const result = forecastPool(
      input({
        allocatable: [
          account({ occupied: 1, maxSlots: 5, slotAssignedAts: [recent, NOW] }),
        ],
        history: [filled("past-a"), filled("past-b")],
        assignmentTimes: [recent, NOW],
      })
    );

    expect(result.historicalFillMs).toBe(fortyEightHours);
    expect(result.etaMs).toBeLessThan(HOUR_MS);
    expect(result.horizonMs).toBe(fortyEightHours);
  });

  it("estimates about 38 hours left on a 48 hour fill with four seats free", () => {
    const start = new Date("2026-09-01T00:00:00.000Z");
    const fortyEightHours = 48 * HOUR_MS;
    const filled = (id: string): ForecastAccount =>
      account({
        id,
        maxSlots: 5,
        slotAssignedAts: [
          start,
          new Date(start.getTime() + HOUR_MS),
          new Date(start.getTime() + 2 * HOUR_MS),
          new Date(start.getTime() + 3 * HOUR_MS),
          new Date(start.getTime() + fortyEightHours),
        ],
      });
    const result = forecastPool(
      input({
        allocatable: [account({ occupied: 1, maxSlots: 5, slotAssignedAts: [NOW] })],
        history: [filled("past-a"), filled("past-b")],
        assignmentTimes: [NOW],
      })
    );

    expect(result.shouldAlert).toBe(true);
    expect(result.etaMs).toBe(Math.round(fortyEightHours * (4 / 5)));
    expect(result.horizonMs).toBe(fortyEightHours);
  });

  describe("pending demand by country", () => {
    const requests = [
      { countryId: "us" },
      { countryId: null },
      { countryId: "fr" },
      { countryId: null },
    ];

    it("counts unscoped requests against a country pool", () => {
      expect(countPendingForPool("us", requests)).toBe(3);
    });

    it("counts only unscoped requests against the null-country pool", () => {
      expect(countPendingForPool(null, requests)).toBe(2);
    });
  });

  it("builds a stable pool key when the country is missing", () => {
    expect(poolKeyFor("provider", null)).toBe("provider:none");
    expect(poolKeyFor("provider", "country")).toBe("provider:country");
  });
});
