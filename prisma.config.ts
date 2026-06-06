import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile?.(".env");
} catch {
  // Local validation can also provide DATABASE_URL directly.
}

function normalizePrismaDatabaseUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (databaseUrl.startsWith("file:../data/")) {
    return databaseUrl.replace("file:../data/", "file:./data/");
  }

  return databaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "pnpm tsx prisma/seed.ts"
  },
  datasource: {
    url: normalizePrismaDatabaseUrl(process.env.DATABASE_URL)
  }
});
