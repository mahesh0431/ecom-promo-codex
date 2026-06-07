import { afterEach, describe, expect, test, vi } from "vitest";

const codexSdkMock = vi.hoisted(() => ({
  run: vi.fn()
}));

vi.mock("@openai/codex-sdk", () => ({
  Codex: class {
    startThread() {
      return {
        run: codexSdkMock.run
      };
    }
  }
}));

import {
  buildCodexConfig,
  buildCodexOptions,
  buildCodexProcessEnv,
  buildCodexThreadOptions,
  getCodexHome,
  getCodexWorkspace,
  buildPromoMcpEnv,
  SdkCodexGateway
} from "@/server/codex/sdk-codex-gateway";

const originalEnv = {
  CODEX_HOME: process.env.CODEX_HOME,
  CODEX_MODEL: process.env.CODEX_MODEL,
  CODEX_REASONING_EFFORT: process.env.CODEX_REASONING_EFFORT,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS
};

describe("SDK Codex gateway configuration", () => {
  afterEach(() => {
    codexSdkMock.run.mockReset();
    restoreEnv("CODEX_HOME", originalEnv.CODEX_HOME);
    restoreEnv("CODEX_MODEL", originalEnv.CODEX_MODEL);
    restoreEnv(
      "CODEX_REASONING_EFFORT",
      originalEnv.CODEX_REASONING_EFFORT
    );
    restoreEnv("DATABASE_URL", originalEnv.DATABASE_URL);
    restoreEnv("NODE_ENV", originalEnv.NODE_ENV);
    restoreEnv("OPENAI_API_KEY", originalEnv.OPENAI_API_KEY);
    restoreEnv("SESSION_COOKIE_NAME", originalEnv.SESSION_COOKIE_NAME);
    restoreEnv("SESSION_TTL_DAYS", originalEnv.SESSION_TTL_DAYS);
  });

  test("passes the selected app database to the promo MCP server", () => {
    process.env.DATABASE_URL = "file:../data/live-integration.sqlite";
    process.env.SESSION_COOKIE_NAME = "ecom_promo_live_session";
    process.env.SESSION_TTL_DAYS = "7";

    expect(buildPromoMcpEnv()).toMatchObject({
      DATABASE_URL: "file:../data/live-integration.sqlite",
      SESSION_COOKIE_NAME: "ecom_promo_live_session",
      SESSION_TTL_DAYS: "7"
    });

    const config = buildCodexConfig();
    const server = config.mcp_servers["promo-campaign-mcp"];

    expect(server.cwd).toBe(process.cwd());
    expect(server.env).toMatchObject({
      DATABASE_URL: "file:../data/live-integration.sqlite"
    });
  });

  test("keeps backend Codex SDK access scoped to read-only MCP tools", () => {
    const server = buildCodexConfig().mcp_servers["promo-campaign-mcp"];

    expect(server.enabled_tools).toEqual([
      "get_campaign_overview",
      "list_products_for_campaign_review",
      "get_product_campaign_context"
    ]);
  });

  test("requires the shared OpenAI API key for Codex SDK runs", () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => buildCodexOptions()).toThrow(
      /OPENAI_API_KEY is required for Codex SDK runs/
    );
  });

  test("uses the shared OpenAI API key without exposing it to the spawned CLI", () => {
    process.env.OPENAI_API_KEY = "openai-api-key";

    expect(buildCodexOptions()).toMatchObject({
      apiKey: "openai-api-key"
    });
    expect(buildCodexOptions().env).not.toHaveProperty("OPENAI_API_KEY");
  });

  test("keeps the spawned CLI environment limited to runtime basics", () => {
    process.env.OPENAI_API_KEY = "openai-api-key";
    process.env.DATABASE_URL = "file:../data/live-integration.sqlite";

    expect(buildCodexProcessEnv()).toMatchObject({
      CODEX_HOME: `${process.cwd()}/output/codex-runtime/home`
    });
    expect(buildCodexProcessEnv()).not.toHaveProperty("DATABASE_URL");
    expect(buildCodexProcessEnv()).not.toHaveProperty("OPENAI_API_KEY");
  });

  test("uses an app-owned Codex home by default", () => {
    delete process.env.CODEX_HOME;

    expect(getCodexHome()).toBe(`${process.cwd()}/output/codex-runtime/home`);
  });

  test("uses an app-owned Codex workspace by default", () => {
    expect(getCodexWorkspace()).toBe(
      `${process.cwd()}/output/codex-runtime/workspace`
    );
  });

  test("ignores ambient Codex home overrides", () => {
    process.env.CODEX_HOME = "data/custom-codex-home";

    expect(getCodexHome()).toBe(`${process.cwd()}/output/codex-runtime/home`);
  });

  test("starts Codex with app-owned defaults", () => {
    process.env.CODEX_MODEL = "different-model";
    process.env.CODEX_REASONING_EFFORT = "extreme";

    expect(buildCodexThreadOptions()).toMatchObject({
      model: "gpt-5.5",
      modelReasoningEffort: "low",
      sandboxMode: "read-only",
      workingDirectory: `${process.cwd()}/output/codex-runtime/workspace`,
      approvalPolicy: "never",
      skipGitRepoCheck: true,
      webSearchMode: "disabled"
    });
  });

  test("maps invalid structured Codex responses to output errors", async () => {
    process.env.OPENAI_API_KEY = "openai-api-key";
    codexSdkMock.run.mockResolvedValueOnce({
      finalResponse: JSON.stringify({
        opportunities: [
          {
            productId: "product-1"
          }
        ]
      }),
      items: []
    });

    const gateway = new SdkCodexGateway();

    await expect(gateway.findCampaignOpportunities()).rejects.toMatchObject({
      code: "CODEX_OUTPUT_ERROR",
      status: 502
    });
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
