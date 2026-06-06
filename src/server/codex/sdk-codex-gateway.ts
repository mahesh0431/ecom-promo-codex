import { Codex, type McpToolCallItem, type SandboxMode } from "@openai/codex-sdk";
import { z } from "zod";

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
    const result = await this.runStructured(
      buildOpportunityDiscoveryPrompt(),
      codexOpportunityOutputSchema
    );

    return codexOpportunityOutputSchema.parse(result);
  }

  async generateInstagramCampaign(
    input: GenerateInstagramCampaignInput
  ): Promise<CampaignGenerationResult> {
    const result = await this.runStructured(
      buildCampaignGenerationPrompt(input),
      codexCampaignOutputSchema
    );

    return codexCampaignOutputSchema.parse(result);
  }

  private async runStructured(prompt: string, schema: z.ZodType) {
    const codex = new Codex({
      config: buildCodexConfig()
    });
    const thread = codex.startThread({
      model: process.env.CODEX_MODEL,
      sandboxMode: getSandboxMode(),
      workingDirectory: getProjectRoot(),
      approvalPolicy: "never",
      skipGitRepoCheck: false
    });

    try {
      const turn = await thread.run(prompt, {
        outputSchema: toOpenAiJsonSchema(schema)
      });

      if (this.options.captureEvidence) {
        this.captureMcpToolCalls(turn.items);
      }

      return parseCodexJson(turn.finalResponse);
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

export function buildCodexConfig() {
  return {
    mcp_servers: {
      [PROMO_MCP_SERVER_NAME]: {
        command: "pnpm",
        args: ["exec", "tsx", "src/mcp/promo-campaign-mcp.ts"],
        cwd: getProjectRoot(),
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
    (error instanceof Error &&
      (error.message.includes("non-JSON") ||
        error.message.includes("Invalid") ||
        error.name === "ZodError"))
  );
}

function getSandboxMode(): SandboxMode {
  const mode = process.env.CODEX_SANDBOX_MODE;

  if (!mode) {
    return "read-only";
  }

  if (
    mode === "read-only" ||
    mode === "workspace-write" ||
    mode === "danger-full-access"
  ) {
    return mode;
  }

  throw new AppError(
    "VALIDATION_ERROR",
    "CODEX_SANDBOX_MODE must be read-only, workspace-write, or danger-full-access.",
    500
  );
}

function getProjectRoot() {
  return process.cwd();
}
