import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const result = spawnSync("pnpm", ["prisma", "migrate", "dev", ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    PRISMA_SCHEMA_ENGINE_LOG_LEVEL:
      process.env.PRISMA_SCHEMA_ENGINE_LOG_LEVEL ?? "trace",
    RUST_LOG: process.env.RUST_LOG ?? "trace"
  }
});

process.exit(result.status ?? 1);
