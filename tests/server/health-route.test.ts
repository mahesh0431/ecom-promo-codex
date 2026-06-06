import { afterEach, describe, expect, test } from "vitest";

import { GET as health } from "@/app/api/health/route";

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;

describe("health route", () => {
  afterEach(() => {
    if (originalOpenAiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }

    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  });

  test("reports configured backend runtime readiness without exposing secrets", async () => {
    process.env.OPENAI_API_KEY = "secret-openai-key";

    const response = health();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "ok",
      service: "ecom-promo-codex",
      runtime: {
        ready: true,
        openAiApiKeyConfigured: true,
        codex: { ready: true },
        imageGeneration: { ready: true }
      }
    });
    expect(JSON.stringify(body)).not.toContain("secret-openai-key");
  });

  test("reports missing OpenAI key as not ready", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = health();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.runtime).toMatchObject({
      ready: false,
      openAiApiKeyConfigured: false,
      codex: { ready: false },
      imageGeneration: { ready: false }
    });
  });
});
