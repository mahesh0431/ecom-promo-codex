import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  CookieJar,
  hasUngroundedFallbackText,
  isJpegBytes,
  resolveLiveIntegrationDatabaseUrl
} from "../../scripts/live-integration";

describe("live integration script helpers", () => {
  const rootDir = join(tmpdir(), "ecom-promo-codex-live-helper-tests");

  it("resolves the default isolated SQLite database", () => {
    const resolved = resolveLiveIntegrationDatabaseUrl({ rootDir });

    expect(resolved.databaseUrl).toBe("file:../data/live-integration.sqlite");
    expect(resolved.databasePath).toBe(
      join(rootDir, "data", "live-integration.sqlite")
    );
    expect(resolved.databaseBasename).toBe("live-integration.sqlite");
  });

  it("allows custom live integration SQLite database names inside data", () => {
    const resolved = resolveLiveIntegrationDatabaseUrl({
      rootDir,
      liveIntegrationDatabaseUrl: "file:../data/live-integration-local.sqlite"
    });

    expect(resolved.databasePath).toBe(
      join(rootDir, "data", "live-integration-local.sqlite")
    );
  });

  it("rejects unsafe database URLs before reset", () => {
    expect(() =>
      resolveLiveIntegrationDatabaseUrl({
        rootDir,
        liveIntegrationDatabaseUrl: "postgresql://example"
      })
    ).toThrow(/only file: SQLite/i);

    expect(() =>
      resolveLiveIntegrationDatabaseUrl({
        rootDir,
        liveIntegrationDatabaseUrl: "file:../data/dev.sqlite"
      })
    ).toThrow(/live-integration.*sqlite/i);

    expect(() =>
      resolveLiveIntegrationDatabaseUrl({
        rootDir,
        liveIntegrationDatabaseUrl: "file:../data/test.sqlite"
      })
    ).toThrow(/live-integration.*sqlite/i);

    expect(() =>
      resolveLiveIntegrationDatabaseUrl({
        rootDir,
        liveIntegrationDatabaseUrl: "file:../../outside/live-integration.sqlite"
      })
    ).toThrow(/repo data directory/i);
  });

  it("parses cookies without exposing values in metadata", () => {
    const jar = new CookieJar();

    jar.storeFromSetCookie([
      "ecom_promo_session=secret-token; Path=/; HttpOnly",
      "theme=light; Path=/"
    ]);

    expect(jar.toHeader()).toBe("ecom_promo_session=secret-token; theme=light");
    expect(jar.cookieNames()).toEqual(["ecom_promo_session", "theme"]);
  });

  it("detects JPEG image bytes", () => {
    expect(isJpegBytes(Buffer.from([0xff, 0xd8, 0xff, 0xee]))).toBe(true);
    expect(isJpegBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it("flags ungrounded Codex fallback campaign text", () => {
    expect(hasUngroundedFallbackText("UNAVAILABLE: product was not found.")).toBe(
      true
    );
    expect(
      hasUngroundedFallbackText("MCP shows 180 units available and 3 sold.")
    ).toBe(false);
  });

});
