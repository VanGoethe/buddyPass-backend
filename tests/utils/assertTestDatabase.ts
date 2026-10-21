/**
 * Suites that clear tables must not run against a shared or development database.
 * The database name has to contain "test", as in buddypass_test.
 */
export function assertTestDatabase(
  databaseUrl: string | undefined = process.env.DATABASE_URL
): void {
  const name = databaseUrl?.split("/").pop()?.split("?")[0] ?? "";
  if (!name.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to delete rows. DATABASE_URL must use a database whose name contains "test" (got "${name || "unset"}").`
    );
  }
}
