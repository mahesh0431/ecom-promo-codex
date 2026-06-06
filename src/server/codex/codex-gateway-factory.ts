import type { CodexGateway } from "@/server/codex/codex-gateway";
import { createFakeCodexGateway } from "@/server/codex/fake-codex-gateway";
import { createSdkCodexGateway } from "@/server/codex/sdk-codex-gateway";
import { AppError } from "@/server/errors";

export type CodexGatewayMode = "sdk" | "fake";

export function createCodexGateway(): CodexGateway {
  const mode = getCodexGatewayMode();

  if (mode === "fake") {
    return createFakeCodexGateway();
  }

  return createSdkCodexGateway();
}

export function getCodexGatewayMode(): CodexGatewayMode {
  const configuredMode = process.env.CODEX_GATEWAY;

  if (configuredMode === "sdk" || configuredMode === "fake") {
    return configuredMode;
  }

  if (configuredMode) {
    throw new AppError(
      "VALIDATION_ERROR",
      "CODEX_GATEWAY must be either sdk or fake.",
      500
    );
  }

  if (process.env.NODE_ENV === "test") {
    return "fake";
  }

  return "sdk";
}
