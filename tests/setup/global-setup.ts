import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(rootDir, "data");
const testDbPath = join(dataDir, "test.sqlite");

export default async function setup() {
  process.env.DATABASE_URL = "file:../data/test.sqlite";
  process.env.SESSION_COOKIE_NAME = "ecom_promo_test_session";
  process.env.SESSION_TTL_DAYS = "7";
  process.env.IMAGE_GENERATION_MODE = "fake";
  process.env.PRISMA_SCHEMA_ENGINE_LOG_LEVEL ??= "trace";
  process.env.RUST_LOG ??= "trace";

  await mkdir(dataDir, { recursive: true });
  await rm(testDbPath, { force: true });
  await rm(`${testDbPath}-journal`, { force: true });
  await rm(`${testDbPath}-wal`, { force: true });
  await rm(`${testDbPath}-shm`, { force: true });

  execFileSync("pnpm", ["prisma", "db", "push", "--force-reset"], {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL: "file:../data/test.sqlite",
      SESSION_COOKIE_NAME: "ecom_promo_test_session",
      SESSION_TTL_DAYS: "7",
      IMAGE_GENERATION_MODE: "fake",
      PRISMA_SCHEMA_ENGINE_LOG_LEVEL: "trace",
      RUST_LOG: "trace"
    },
    stdio: "inherit"
  });

  execFileSync("pnpm", ["tsx", "prisma/seed.ts"], {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL: "file:../data/test.sqlite",
      SESSION_COOKIE_NAME: "ecom_promo_test_session",
      SESSION_TTL_DAYS: "7",
      IMAGE_GENERATION_MODE: "fake"
    },
    stdio: "inherit"
  });
}
