import { readFile } from "node:fs/promises";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, test } from "vitest";

import {
  handleGetCampaignOverview,
  handleGetProductCampaignContext,
  handleListProductsForCampaignReview
} from "@/mcp/tool-handlers";
import {
  createPromoCampaignMcpServer,
  PROMO_CAMPAIGN_MCP_INSTRUCTIONS
} from "@/mcp/promo-campaign-mcp";

const plannedInstructions =
  "This server exposes read-only eCommerce product and sales context for campaign planning. Use it to inspect product metrics, campaign review rows, and campaign context for a selected product. Do not request writes, auth/session data, secrets, image generation, or campaign persistence.";

describe("promo campaign MCP handlers", () => {
  test("returns the campaign overview from product services", async () => {
    await expect(handleGetCampaignOverview()).resolves.toEqual({
      totalProducts: 10,
      totalAvailableStock: 1075,
      unitsSoldThisMonth: 120
    });
  });

  test("lists JSON-safe campaign review products with an optional limit", async () => {
    const payload = await handleListProductsForCampaignReview({ limit: 2 });

    expect(payload.products).toHaveLength(2);
    expect(payload.products[0]).toMatchObject({
      sku: "SKU-COF-COLD-001",
      name: "Cold Brew Concentrate",
      category: "Grocery",
      priceCents: 1299,
      availableQuantity: 180,
      unitsSoldThisMonth: 3,
      recentSalesSummary: "3 units sold this month"
    });
    expect(payload.products[0]?.signalFacts).toEqual(
      expect.arrayContaining([
        "High stock: 180 units available",
        "Low current-month sales: 3 units sold"
      ])
    );
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });

  test("returns product campaign context for a selected product", async () => {
    const { products } = await handleListProductsForCampaignReview({ limit: 1 });
    const productId = products[0]?.productId;

    expect(productId).toBeDefined();

    const payload = await handleGetProductCampaignContext({ productId: productId! });

    expect(payload).toMatchObject({
      product: {
        productId,
        sku: "SKU-COF-COLD-001",
        name: "Cold Brew Concentrate",
        category: "Grocery",
        priceCents: 1299
      },
      availableQuantity: 180,
      unitsSoldThisMonth: 3,
      recentSalesSummary: "3 units sold this month"
    });
    expect(payload.recentSales[0]?.saleDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });

  test("maps an invalid product id to a NOT_FOUND-style AppError", async () => {
    await expect(
      handleGetProductCampaignContext({ productId: "missing-product" })
    ).rejects.toMatchObject({
      name: "AppError",
      code: "NOT_FOUND",
      status: 404
    });
  });
});

describe("promo campaign MCP server", () => {
  test("exposes the planned instructions and exactly three tools", async () => {
    const server = createPromoCampaignMcpServer();
    const client = new Client({ name: "mcp-tools-test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    try {
      expect(client.getInstructions()?.slice(0, 512)).toBe(
        plannedInstructions.slice(0, 512)
      );

      const tools = await client.listTools();

      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "get_campaign_overview",
        "get_product_campaign_context",
        "list_products_for_campaign_review"
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  test("does not add non-MCP stdout logging to the stdio entrypoint", async () => {
    expect(PROMO_CAMPAIGN_MCP_INSTRUCTIONS.slice(0, 512)).toBe(
      plannedInstructions.slice(0, 512)
    );

    const entrypoint = await readFile("src/mcp/promo-campaign-mcp.ts", "utf8");

    expect(entrypoint).not.toContain("console.log");
    expect(entrypoint).not.toContain("process.stdout.write");
  });
});
