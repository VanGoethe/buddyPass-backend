import { selectSubscriptionForAllocation } from "../../../src/types/subscriptions";

describe("selectSubscriptionForAllocation", () => {
  it("returns the first candidate that still has capacity", () => {
    const selected = selectSubscriptionForAllocation([
      { id: "full", maxSlots: 2, occupied: 2 },
      { id: "open", maxSlots: 4, occupied: 3 },
      { id: "later", maxSlots: 4, occupied: 0 },
    ]);

    expect(selected).toEqual({ id: "open", maxSlots: 4, occupied: 3 });
  });

  it("returns null when every candidate is full", () => {
    expect(
      selectSubscriptionForAllocation([
        { id: "a", maxSlots: 1, occupied: 1 },
        { id: "b", maxSlots: 3, occupied: 3 },
      ])
    ).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(selectSubscriptionForAllocation([])).toBeNull();
  });
});
