import type {
  CodexOptions,
  ModelReasoningEffort,
  McpToolCallItem,
  SandboxMode,
  ThreadOptions
} from "@openai/codex-sdk";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { z, ZodError } from "zod";

import type {
  CampaignGenerationResult,
  OpportunityDiscoveryResult
} from "@/server/codex/codex-types";
import type {
  CodexGateway,
  GenerateInstagramCampaignInput
} from "@/server/codex/codex-gateway";
import {
  codexCampaignOutputSchema,
  codexOpportunityOutputSchema
} from "@/server/codex/codex-schemas";
import {
  buildCampaignGenerationPrompt,
  buildOpportunityDiscoveryPrompt
} from "@/server/codex/codex-prompts";
import { AppError } from "@/server/errors";

const PROMO_MCP_SERVER_NAME = "promo-campaign-mcp";
const CODEX_PROCESS_ENV_ALLOWLIST = [
  "CODEX_CA_CERTIFICATE",
  "COREPACK_HOME",
  "HOME",
  "NODE_ENV",
  "PATH",
  "PNPM_HOME",
  "RUST_LOG",
  "SHELL",
  "SSL_CERT_FILE",
  "TEMP",
  "TMP",
  "TMPDIR"
] as const;
const DEFAULT_CODEX_HOME = "output/codex-runtime/home";
const DEFAULT_CODEX_WORKSPACE = "output/codex-runtime/workspace";
const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_REASONING_EFFORT: ModelReasoningEffort = "low";
const DEFAULT_CODEX_SANDBOX_MODE: SandboxMode = "read-only";

export type SdkRunEvidence = {
  mcpToolCalls: Array<{
    server: string;
    tool: string;
    status: string;
    errorMessage?: string;
  }>;
};

export type SdkCodexGatewayOptions = {
  captureEvidence?: boolean;
};

export function createSdkCodexGateway(
  options: SdkCodexGatewayOptions = {}
): CodexGateway {
  const gateway = new SdkCodexGateway(options);

  return gateway;
}

export class SdkCodexGateway implements CodexGateway {
  readonly evidence: SdkRunEvidence = {
    mcpToolCalls: []
  };

  constructor(private readonly options: SdkCodexGatewayOptions = {}) {}

  async findCampaignOpportunities(): Promise<OpportunityDiscoveryResult> {
    return this.runStructured(
      buildOpportunityDiscoveryPrompt(),
      codexOpportunityOutputSchema
    );
  }

  async generateInstagramCampaign(
    input: GenerateInstagramCampaignInput
  ): Promise<CampaignGenerationResult> {
    return this.runStructured(
      buildCampaignGenerationPrompt(input),
      codexCampaignOutputSchema
    );
  }

  private async runStructured<T>(
    prompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    const { Codex } = await import("@openai/codex-sdk");
    const codex = new Codex(buildCodexOptions());
    const thread = codex.startThread(buildCodexThreadOptions());

    try {
      const turn = await thread.run(prompt, {
        outputSchema: toOpenAiJsonSchema(schema)
      });

      if (this.options.captureEvidence) {
        this.captureMcpToolCalls(turn.items);
      }

      return schema.parse(parseCodexJson(turn.finalResponse));
    } catch (error) {
      if (isOutputError(error)) {
        throw new AppError(
          "CODEX_OUTPUT_ERROR",
          error instanceof Error ? error.message : "Invalid Codex output.",
          502
        );
      }

      throw new AppError(
        "CODEX_RUNTIME_ERROR",
        error instanceof Error ? error.message : "Codex runtime failed.",
        502
      );
    }
  }

  private captureMcpToolCalls(items: Array<{ type: string }>) {
    for (const item of items) {
      if (item.type !== "mcp_tool_call") {
        continue;
      }

      const mcpItem = item as McpToolCallItem;

      this.evidence.mcpToolCalls.push({
        server: mcpItem.server,
        tool: mcpItem.tool,
        status: mcpItem.status,
        errorMessage: mcpItem.error?.message
      });
    }
  }
}

export function buildCodexOptions(): CodexOptions {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new AppError(
      "VALIDATION_ERROR",
      "OPENAI_API_KEY is required for Codex SDK runs.",
      500
    );
  }

  const options: CodexOptions = {
    apiKey,
    config: buildCodexConfig(),
    env: buildCodexProcessEnv()
  };

  return options;
}

export function buildCodexProcessEnv() {
  const env: Record<string, string> = {};

  for (const key of CODEX_PROCESS_ENV_ALLOWLIST) {
    const value = process.env[key];

    if (value !== undefined) {
      env[key] = value;
    }
  }

  env.CODEX_HOME = ensureCodexHome();

  return env;
}

export function buildCodexThreadOptions(): ThreadOptions {
  return {
    model: getCodexModel(),
    modelReasoningEffort: getCodexReasoningEffort(),
    sandboxMode: getSandboxMode(),
    workingDirectory: ensureCodexWorkspace(),
    approvalPolicy: "never",
    skipGitRepoCheck: true,
    webSearchMode: "disabled"
  };
}

export function buildCodexConfig() {
  return {
    mcp_servers: {
      [PROMO_MCP_SERVER_NAME]: {
        command: "pnpm",
        args: ["exec", "tsx", "src/mcp/promo-campaign-mcp.ts"],
        cwd: getProjectRoot(),
        env: buildPromoMcpEnv(),
        enabled: true,
        required: true,
        enabled_tools: [
          "get_campaign_overview",
          "list_products_for_campaign_review",
          "get_product_campaign_context"
        ],
        default_tools_approval_mode: "approve",
        tools: {
          get_campaign_overview: {
            approval_mode: "approve"
          },
          list_products_for_campaign_review: {
            approval_mode: "approve"
          },
          get_product_campaign_context: {
            approval_mode: "approve"
          }
        },
        startup_timeout_sec: 20,
        tool_timeout_sec: 60
      }
    }
  };
}

export function buildPromoMcpEnv() {
  const env: Record<string, string> = {};
  const forwardedKeys = [
    "DATABASE_URL",
    "SESSION_COOKIE_NAME",
    "SESSION_TTL_DAYS",
    "NODE_ENV"
  ];

  for (const key of forwardedKeys) {
    const value = process.env[key];

    if (value) {
      env[key] = value;
    }
  }

  return env;
}

export function hasPromoMcpToolCall(evidence: SdkRunEvidence) {
  return evidence.mcpToolCalls.some(
    (call) =>
      call.server === PROMO_MCP_SERVER_NAME && call.status === "completed"
  );
}

function toOpenAiJsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema);
}

function parseCodexJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Codex returned non-JSON output.", { cause: error });
  }
}

function isOutputError(error: unknown) {
  return (
    error instanceof SyntaxError ||
    error instanceof ZodError ||
    (error instanceof Error &&
      (error.message.includes("non-JSON") ||
        error.name === "ZodError"))
  );
}

function getSandboxMode(): SandboxMode {
  return DEFAULT_CODEX_SANDBOX_MODE;
}

export function getCodexHome() {
  return join(getProjectRoot(), DEFAULT_CODEX_HOME);
}

export function ensureCodexHome() {
  const codexHome = getCodexHome();
  mkdirSync(codexHome, { recursive: true });
  return codexHome;
}

export function getCodexWorkspace() {
  return join(getProjectRoot(), DEFAULT_CODEX_WORKSPACE);
}

export function ensureCodexWorkspace() {
  const codexWorkspace = getCodexWorkspace();
  mkdirSync(codexWorkspace, { recursive: true });
  return codexWorkspace;
}

export function getCodexModel() {
  return DEFAULT_CODEX_MODEL;
}

export function getCodexReasoningEffort(): ModelReasoningEffort {
  return DEFAULT_CODEX_REASONING_EFFORT;
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim();
}

function getProjectRoot() {
  return process.cwd();
}
