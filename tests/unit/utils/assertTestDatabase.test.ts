import { assertTestDatabase } from "../../utils/assertTestDatabase";

describe("assertTestDatabase", () => {
  it("allows a database whose name contains test", () => {
    expect(() =>
      assertTestDatabase("postgresql://postgres:postgres@localhost:5432/buddypass_test")
    ).not.toThrow();
  });

  it("refuses a development database", () => {
    expect(() =>
      assertTestDatabase("postgresql://postgres:postgres@localhost:5432/buddypass_db")
    ).toThrow(/buddypass_db/);
  });
});
