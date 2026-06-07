import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

function copyIfMissing(source: string, target: string) {
  if (existsSync(target)) {
    console.log(`${target} already exists`);
    return;
  }

  copyFileSync(source, target);
  console.log(`created ${target}`);
}

function run(command: string, args: string[]) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      PRISMA_SCHEMA_ENGINE_LOG_LEVEL: "trace",
      RUST_LOG: "trace"
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

mkdirSync("data", { recursive: true });
copyIfMissing(".env.example", ".env");
copyIfMissing(".env.test.example", ".env.test");

run("pnpm", ["prisma", "migrate", "deploy"]);
run("pnpm", ["db:seed"]);
run("pnpm", ["db:verify"]);

console.log("\nDemo setup complete.");
console.log("Add OPENAI_API_KEY to .env for live Codex and image generation.");
