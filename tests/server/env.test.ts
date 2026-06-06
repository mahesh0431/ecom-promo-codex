import { describe, expect, test } from "vitest";

import { getServerEnv } from "@/server/env";

describe("server env", () => {
  test("parses required backend environment values", () => {
    const env = getServerEnv();

    expect(env.databaseUrl).toBe("file:../data/test.sqlite");
    expect(env.sessionCookieName).toBe("ecom_promo_test_session");
    expect(env.sessionTtlDays).toBe(7);
  });

  test("treats a blank OpenAI API key as absent", () => {
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";

    try {
      const env = getServerEnv();

      expect(env.openaiApiKey).toBeUndefined();
    } finally {
      if (previousKey) {
        process.env.OPENAI_API_KEY = previousKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });
});
