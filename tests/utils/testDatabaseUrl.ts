import fs from "fs";

const TCP_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/buddypass_test";

const SOCKET_DIRECTORIES = ["/tmp", "/var/run/postgresql", "/run/postgresql"];

/**
 * CI sets DATABASE_URL. A local run with no .env used to assume password
 * login on TCP, which Homebrew Postgres rejects. A socket in the usual
 * directories is used instead, still against buddypass_test.
 */
export function resolveTestDatabaseUrl(
  configuredDatabaseUrl: string,
  socketPathExists: (socketPath: string) => boolean = fs.existsSync
): string {
  const placeholder =
    configuredDatabaseUrl.length === 0 ||
    configuredDatabaseUrl.includes("username:password");
  if (!placeholder) {
    return configuredDatabaseUrl;
  }

  const socketDir = SOCKET_DIRECTORIES.find((dir) =>
    socketPathExists(`${dir}/.s.PGSQL.5432`)
  );
  if (!socketDir) {
    return TCP_TEST_DATABASE_URL;
  }

  return `postgresql://postgres@localhost/buddypass_test?host=${socketDir}`;
}
