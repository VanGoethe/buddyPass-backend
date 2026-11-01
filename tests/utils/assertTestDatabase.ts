/**
 * Suites that clear tables must not run against a shared or development database.
 * The database name has to contain "test", as in buddypass_test.
 */
export function databaseNameFromUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) return "";
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, "").split("/")[0] ?? "";
  } catch {
    return databaseUrl.split("/").pop()?.split("?")[0] ?? "";
  }
}

export function assertTestDatabase(
  databaseUrl: string | undefined = process.env.DATABASE_URL
): void {
  const name = databaseNameFromUrl(databaseUrl);
  if (!name.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to delete rows. DATABASE_URL must use a database whose name contains "test" (got "${name || "unset"}").`
    );
  }
}
