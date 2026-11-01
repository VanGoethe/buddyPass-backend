import { assertTestDatabase } from "../../utils/assertTestDatabase";
import { resolveTestDatabaseUrl } from "../../utils/testDatabaseUrl";

describe("assertTestDatabase", () => {
  it("allows a database whose name contains test", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://postgres:postgres@localhost:5432/buddypass_test"
      )
    ).not.toThrow();
  });

  it("allows a socket URL whose query contains a slash", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://postgres@localhost/buddypass_test?host=/tmp"
      )
    ).not.toThrow();
  });

  it("refuses a development database", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://postgres:postgres@localhost:5432/buddypass_db"
      )
    ).toThrow(/buddypass_db/);
  });

  it("refuses a development database reached through a socket", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://postgres@localhost/buddypass_db?host=/tmp"
      )
    ).toThrow(/buddypass_db/);
  });
});

describe("resolveTestDatabaseUrl", () => {
  const socketAt = (dir: string) => (path: string) =>
    path === `${dir}/.s.PGSQL.5432`;

  it("keeps an explicit database URL", () => {
    const configured =
      "postgresql://postgres:postgres@localhost:5432/buddypass_test";
    expect(resolveTestDatabaseUrl(configured, () => true)).toBe(configured);
  });

  it("uses a local socket when DATABASE_URL is unset", () => {
    expect(resolveTestDatabaseUrl("", socketAt("/tmp"))).toBe(
      "postgresql://postgres@localhost/buddypass_test?host=/tmp"
    );
  });

  it("replaces the env.example placeholder", () => {
    expect(
      resolveTestDatabaseUrl(
        "postgresql://username:password@localhost:5432/buddypass_db",
        socketAt("/var/run/postgresql")
      )
    ).toBe(
      "postgresql://postgres@localhost/buddypass_test?host=/var/run/postgresql"
    );
  });

  it("keeps TCP password login when no socket is present", () => {
    expect(resolveTestDatabaseUrl("", () => false)).toBe(
      "postgresql://postgres:postgres@localhost:5432/buddypass_test"
    );
  });
});
