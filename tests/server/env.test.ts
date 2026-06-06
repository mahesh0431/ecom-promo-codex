import { describe, expect, test } from "vitest";

import { getServerEnv } from "@/server/env";

describe("server env", () => {
  test("parses required backend environment values", () => {
    const env = getServerEnv();

    expect(env.databaseUrl).toBe("file:../data/test.sqlite");
    expect(env.sessionCookieName).toBe("ecom_promo_test_session");
    expect(env.sessionTtlDays).toBe(7);
  });
});
