import { describe, expect, test } from "vitest";

import {
  buildCampaignGenerationPrompt,
  buildOpportunityDiscoveryPrompt
} from "@/server/codex/codex-prompts";

describe("Codex prompts", () => {
  test("instructs opportunity discovery to copy product identifiers exactly", () => {
    const prompt = buildOpportunityDiscoveryPrompt();

    expect(prompt).toContain("list_products_for_campaign_review");
    expect(prompt).toContain("copy productId and sku exactly");
    expect(prompt).toContain("Do not invent, shorten, or transform productId");
  });

  test("instructs campaign generation to echo the requested product id", () => {
    const prompt = buildCampaignGenerationPrompt({
      productId: "product-123",
      optionalInstructions: "Keep it concise."
    });

    expect(prompt).toContain("productId product-123");
    expect(prompt).toContain("Return productId exactly as product-123");
  });
});
