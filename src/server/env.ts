import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).default("ecom_promo_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  OPENAI_API_KEY: optionalNonEmptyString,
  IMAGE_GENERATION_MODE: z.enum(["fake", "openai"]).default("openai")
});

export type ServerEnv = {
  databaseUrl: string;
  sessionCookieName: string;
  sessionTtlDays: number;
  openaiApiKey?: string;
  imageGenerationMode: "fake" | "openai";
};

export function getServerEnv(): ServerEnv {
  loadLocalEnv();

  const parsed = envSchema.parse(process.env);

  return {
    databaseUrl: parsed.DATABASE_URL,
    sessionCookieName: parsed.SESSION_COOKIE_NAME,
    sessionTtlDays: parsed.SESSION_TTL_DAYS,
    openaiApiKey: parsed.OPENAI_API_KEY,
    imageGenerationMode: parsed.IMAGE_GENERATION_MODE
  };
}

export function getSqliteAdapterUrl() {
  const { databaseUrl } = getServerEnv();

  if (databaseUrl.startsWith("file:../data/")) {
    return databaseUrl.replace("file:../data/", "file:./data/");
  }

  return databaseUrl;
}

function loadLocalEnv() {
  if (process.env.DATABASE_URL) {
    return;
  }

  try {
    process.loadEnvFile?.(".env");
  } catch {
    return;
  }
}
