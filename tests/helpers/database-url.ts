/** DATABASE_URL for local tests (Compose uses postgres hostname; tests use localhost). */
export function resolveDatabaseUrl(): string | undefined {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD;
  const db = process.env.POSTGRES_DB?.trim() || "tama";
  const port = process.env.POSTGRES_PORT?.trim() || "5432";

  if (!user || password === undefined || password === "") {
    if (process.env.RUN_INTEGRATION_TESTS === "1") {
      return ciDefaultDatabaseUrl();
    }
    return undefined;
  }

  const host = process.env.POSTGRES_HOST?.trim() || "localhost";
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgres://${encodedUser}:${encodedPassword}@${host}:${port}/${db}`;
}

export function integrationTestsEnabled(): boolean {
  return process.env.RUN_INTEGRATION_TESTS === "1" && !!resolveDatabaseUrl();
}

/** Ephemeral Postgres in GitHub Actions (trust auth, see tests.yml). */
function ciDefaultDatabaseUrl(): string {
  const host = process.env.POSTGRES_HOST?.trim() || "localhost";
  const port = process.env.POSTGRES_PORT?.trim() || "5432";
  const db = process.env.POSTGRES_DB?.trim() || "tama";
  return `postgres://postgres@${host}:${port}/${db}`;
}
