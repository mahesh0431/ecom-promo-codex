import { describe, expect, test } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { loginWithPassword } from "@/server/auth/auth-service";
import { hashPassword, verifyPasswordHash } from "@/server/auth/password";
import {
  createSession,
  destroySession,
  getSession
} from "@/server/auth/session-service";

describe("auth services", () => {
  test("hashes and verifies passwords with scrypt", async () => {
    const hash = await hashPassword("demo-password");

    expect(hash).toMatch(/^scrypt\$/);
    await expect(verifyPasswordHash("demo-password", hash)).resolves.toBe(true);
    await expect(verifyPasswordHash("wrong-password", hash)).resolves.toBe(false);
  });

  test("logs in only the seeded user with the right password", async () => {
    const result = await loginWithPassword("demo@promo.test", "demo-password");

    expect(result.user.email).toBe("demo@promo.test");
    expect(result.sessionToken.length).toBeGreaterThan(40);

    await expect(
      loginWithPassword("demo@promo.test", "wrong-password")
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  test("creates, reads, and destroys sessions", async () => {
    const result = await loginWithPassword("demo@promo.test", "demo-password");
    const created = await createSession(result.user.id);

    const session = await getSession(created.rawToken);
    expect(session?.user.email).toBe("demo@promo.test");

    await destroySession(created.rawToken);
    await expect(getSession(created.rawToken)).resolves.toBeNull();
  });

  test("maps malformed login JSON to validation errors", async () => {
    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{"
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });
});
