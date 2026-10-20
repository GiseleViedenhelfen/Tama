import "dotenv/config";
import { beforeAll } from "vitest";
import { applyMigrations } from "../../src/db/migrate.js";
import { seedOrders } from "../../src/db/seed.js";
import { closePool } from "../../src/db/order.repository.js";
import { integrationTestsEnabled, resolveDatabaseUrl } from "../helpers/database-url.js";

beforeAll(async () => {
  if (!integrationTestsEnabled()) return;

  const url = resolveDatabaseUrl();
  if (!url) return;

  process.env.DATABASE_URL = url;
  await applyMigrations();
  await seedOrders();
}, 60_000);

export async function resetOrderSeeds(): Promise<void> {
  if (!integrationTestsEnabled()) return;
  await seedOrders();
}

export async function shutdownDatabase(): Promise<void> {
  await closePool();
}
