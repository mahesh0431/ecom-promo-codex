import { describe, expect, test } from "vitest";

import {
  codexCampaignOutputSchema,
  codexOpportunityOutputSchema
} from "@/server/codex/codex-schemas";
import {
  campaignDtoSchema,
  campaignSummaryDtoSchema,
  generateCampaignRequestSchema,
  opportunityDtoSchema
} from "@/server/campaigns/campaign-schemas";

describe("Codex output schemas", () => {
  test("accepts one to three opportunity outputs with confidence levels", () => {
    const parsed = codexOpportunityOutputSchema.parse({
      opportunities: [
        {
          productId: "product-1",
          sku: "SKU-COF-COLD-001",
          signalSummary: "High stock and low current-month sales",
          reasoning:
            "MCP shows 180 units available and only 3 units sold this month.",
          recommendedDiscountPercent: 15,
          recommendedQuantityLimit: 50,
          confidence: "high"
        }
      ]
    });

    expect(parsed.opportunities).toHaveLength(1);
    expect(parsed.opportunities[0]?.confidence).toBe("high");
  });

  test("rejects opportunity outputs outside the planned bounds", () => {
    expect(() =>
      codexOpportunityOutputSchema.parse({ opportunities: [] })
    ).toThrow();

    expect(() =>
      codexOpportunityOutputSchema.parse({
        opportunities: [
          {
            productId: "product-1",
            sku: "SKU-001",
            signalSummary: "Signal 1",
            reasoning: "Reasoning 1",
            recommendedDiscountPercent: 15,
            recommendedQuantityLimit: 50,
            confidence: "medium"
          },
          {
            productId: "product-2",
            sku: "SKU-002",
            signalSummary: "Signal 2",
            reasoning: "Reasoning 2",
            recommendedDiscountPercent: 15,
            recommendedQuantityLimit: 50,
            confidence: "medium"
          },
          {
            productId: "product-3",
            sku: "SKU-003",
            signalSummary: "Signal 3",
            reasoning: "Reasoning 3",
            recommendedDiscountPercent: 15,
            recommendedQuantityLimit: 50,
            confidence: "medium"
          },
          {
            productId: "product-4",
            sku: "SKU-004",
            signalSummary: "Signal 4",
            reasoning: "Reasoning 4",
            recommendedDiscountPercent: 15,
            recommendedQuantityLimit: 50,
            confidence: "medium"
          }
        ]
      })
    ).toThrow();
  });

  test("accepts campaign generation output under Instagram caption length", () => {
    const parsed = codexCampaignOutputSchema.parse({
      productId: "product-1",
      instagramCaption: "Cold brew is stocked and ready for summer.",
      imagePrompt:
        "A product-focused promotional image of bottled cold brew on a bright kitchen counter.",
      reasoning:
        "MCP shows 180 units available and only 3 units sold this month."
    });

    expect(parsed.productId).toBe("product-1");
  });

  test("rejects overlong Instagram captions", () => {
    expect(() =>
      codexCampaignOutputSchema.parse({
        productId: "product-1",
        instagramCaption: "x".repeat(2201),
        imagePrompt: "A product-focused promotional image.",
        reasoning: "Reasoning mentions concrete sales facts."
      })
    ).toThrow();
  });
});

describe("campaign API contract schemas", () => {
  test("parses opportunity DTOs", () => {
    expect(
      opportunityDtoSchema.parse({
        productId: "product-1",
        sku: "SKU-COF-COLD-001",
        signalSummary: "High stock, low current-month sales",
        reasoning: "MCP shows 180 units available and 3 units sold this month.",
        recommendedDiscountPercent: 15,
        recommendedQuantityLimit: 50,
        confidence: "low"
      })
    ).toEqual({
      productId: "product-1",
      sku: "SKU-COF-COLD-001",
      signalSummary: "High stock, low current-month sales",
      reasoning: "MCP shows 180 units available and 3 units sold this month.",
      recommendedDiscountPercent: 15,
      recommendedQuantityLimit: 50,
      confidence: "low"
    });
  });

  test("parses generate campaign requests with optional instructions", () => {
    expect(
      generateCampaignRequestSchema.parse({
        productId: "product-1",
        discountPercent: 15,
        quantityLimit: 80,
        imageVariants: 2,
        optionalInstructions: "Keep the tone playful."
      })
    ).toEqual({
      productId: "product-1",
      discountPercent: 15,
      quantityLimit: 80,
      imageVariants: 2,
      optionalInstructions: "Keep the tone playful."
    });

    expect(
      generateCampaignRequestSchema.parse({
        productId: "product-1",
        discountPercent: 15,
        quantityLimit: 80,
        imageVariants: 1,
        optionalInstructions: ""
      })
    ).toEqual({
      productId: "product-1",
      discountPercent: 15,
      quantityLimit: 80,
      imageVariants: 1
    });

    expect(
      generateCampaignRequestSchema.parse({
        productId: "product-1",
        discountPercent: 100,
        quantityLimit: 80,
        imageVariants: 1
      })
    ).toEqual({
      productId: "product-1",
      discountPercent: 100,
      quantityLimit: 80,
      imageVariants: 1
    });
  });

  test("rejects generate campaign requests missing promo terms", () => {
    expect(() =>
      generateCampaignRequestSchema.parse({ productId: "product-1" })
    ).toThrow();

    expect(() =>
      generateCampaignRequestSchema.parse({
        productId: "product-1",
        discountPercent: 0,
        quantityLimit: 80,
        imageVariants: 1
      })
    ).toThrow();

    expect(() =>
      generateCampaignRequestSchema.parse({
        productId: "product-1",
        discountPercent: 101,
        quantityLimit: 80,
        imageVariants: 1
      })
    ).toThrow();

    expect(() =>
      generateCampaignRequestSchema.parse({
        productId: "product-1",
        discountPercent: 15,
        quantityLimit: 0,
        imageVariants: 1
      })
    ).toThrow();

    expect(() =>
      generateCampaignRequestSchema.parse({
        productId: "product-1",
        discountPercent: 15,
        quantityLimit: 80,
        imageVariants: 3
      })
    ).toThrow();
  });

  test("parses campaign DTOs and summaries", () => {
    const campaign = {
      campaignId: "campaign-1",
      productId: "product-1",
      product: {
        sku: "SKU-COF-COLD-001",
        name: "Cold Brew Concentrate",
        category: "Grocery",
        priceCents: 1299
      },
      prompt: "Generate a promo campaign.",
      optionalInstructions: null,
      discountPercent: 15,
      quantityLimit: 80,
      initialImageVariantsRequested: 2,
      instagramCaption: "Cold brew is stocked and ready.",
      imagePrompt: "Product-focused cold brew promotional image.",
      codexReasoning: "MCP shows 180 units available and 3 sold this month.",
      createdAt: "2026-06-06T12:00:00.000Z"
    };

    expect(campaignDtoSchema.parse(campaign)).toEqual(campaign);
    expect(
      campaignSummaryDtoSchema.parse({
        campaignId: "campaign-1",
        productId: "product-1",
        productName: "Cold Brew Concentrate",
        sku: "SKU-COF-COLD-001",
        discountPercent: 15,
        quantityLimit: 80,
        initialImageVariantsRequested: 2,
        instagramCaption: "Cold brew is stocked and ready.",
        imagePrompt: "Product-focused cold brew promotional image.",
        imageCount: 2,
        createdAt: "2026-06-06T12:00:00.000Z"
      })
    ).toMatchObject({
      campaignId: "campaign-1",
      productName: "Cold Brew Concentrate"
    });
  });
});
