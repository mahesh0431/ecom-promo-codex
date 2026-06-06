import { pathToFileURL } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  handleGetCampaignOverview,
  handleGetProductCampaignContext,
  handleListProductsForCampaignReview
} from "./tool-handlers";
import {
  campaignOverviewSchema,
  getCampaignOverviewInputSchema,
  getProductCampaignContextInputSchema,
  listProductsForCampaignReviewInputSchema,
  listProductsForCampaignReviewOutputSchema,
  productCampaignContextSchema
} from "./tool-schemas";

export const PROMO_CAMPAIGN_MCP_INSTRUCTIONS =
  "This server exposes read-only eCommerce product and sales context for campaign planning. Use it to inspect product metrics, campaign review rows, and campaign context for a selected product. Do not request writes, auth/session data, secrets, image generation, or campaign persistence.";

function structuredToolResult<TPayload extends Record<string, unknown>>(
  payload: TPayload
) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload)
      }
    ],
    structuredContent: payload
  };
}

export function createPromoCampaignMcpServer() {
  const server = new McpServer(
    {
      name: "promo-campaign-mcp",
      version: "0.1.0"
    },
    {
      instructions: PROMO_CAMPAIGN_MCP_INSTRUCTIONS
    }
  );

  server.registerTool(
    "get_campaign_overview",
    {
      description: "Return aggregate product and current-month sales metrics.",
      inputSchema: getCampaignOverviewInputSchema.shape,
      outputSchema: campaignOverviewSchema.shape
    },
    async () => structuredToolResult(await handleGetCampaignOverview())
  );

  server.registerTool(
    "list_products_for_campaign_review",
    {
      description: "Return products and signals for campaign review.",
      inputSchema: listProductsForCampaignReviewInputSchema.shape,
      outputSchema: listProductsForCampaignReviewOutputSchema.shape
    },
    async (input) =>
      structuredToolResult(await handleListProductsForCampaignReview(input))
  );

  server.registerTool(
    "get_product_campaign_context",
    {
      description: "Return product, recent sales, and campaign signals.",
      inputSchema: getProductCampaignContextInputSchema.shape,
      outputSchema: productCampaignContextSchema.shape
    },
    async (input) =>
      structuredToolResult(await handleGetProductCampaignContext(input))
  );

  return server;
}

export async function startPromoCampaignMcpServer() {
  const server = createPromoCampaignMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startPromoCampaignMcpServer().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
