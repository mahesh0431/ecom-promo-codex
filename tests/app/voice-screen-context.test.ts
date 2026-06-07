import { describe, expect, test } from "vitest";

import { buildVoiceScreenContext } from "@/app/voice/screen-context";
import type { CampaignDetailDto } from "@/app/voice/workflow-command-types";
import type { OpportunityDto } from "@/server/campaigns/campaign-types";
import type { ProductForCampaignReview } from "@/server/products/product-types";

const products: ProductForCampaignReview[] = [
  {
    productId: "prod-cold-brew",
    sku: "SKU-COF-COLD-001",
    name: "Cold Brew Concentrate",
    category: "Grocery",
    priceCents: 1299,
    availableQuantity: 180,
    unitsSoldThisMonth: 3,
    recentSalesSummary: "3 units sold recently.",
    signalFacts: ["180 units available", "3 units sold this month"]
  },
  {
    productId: "prod-matcha",
    sku: "SKU-TEA-MATCHA-002",
    name: "Ceremonial Matcha Tin",
    category: "Grocery",
    priceCents: 2499,
    availableQuantity: 95,
    unitsSoldThisMonth: 18,
    recentSalesSummary: "4 units sold recently.",
    signalFacts: ["95 units available", "18 units sold this month"]
  }
];

const opportunities: OpportunityDto[] = [
  {
    productId: "prod-cold-brew",
    sku: "SKU-COF-COLD-001",
    signalSummary: "High stock and slow sales.",
    reasoning: "Cold Brew has 180 units available and only 3 sold.",
    recommendedDiscountPercent: 15,
    recommendedQuantityLimit: 50,
    confidence: "high"
  }
];

const campaignDetail: CampaignDetailDto = {
  campaign: {
    campaignId: "campaign-1",
    productId: "prod-cold-brew",
    product: {
      sku: "SKU-COF-COLD-001",
      name: "Cold Brew Concentrate",
      category: "Grocery",
      priceCents: 1299
    },
    prompt: "Create campaign",
    optionalInstructions: null,
    discountPercent: 15,
    quantityLimit: 50,
    initialImageVariantsRequested: 2,
    instagramCaption: "Cold brew is on promo.",
    imagePrompt: "A clean cold brew product shot.",
    codexReasoning: "High inventory.",
    createdAt: "2026-06-07T00:00:00.000Z"
  },
  images: [
    {
      imageId: "image-1",
      campaignId: "campaign-1",
      imageUrl: "/api/campaigns/campaign-1/images/image-1",
      variantIndex: 1,
      mimeType: "image/png",
      model: "gpt-image-2",
      size: "1024x1024",
      status: "completed",
      createdAt: "2026-06-07T00:00:00.000Z"
    }
  ]
};

describe("voice screen context", () => {
  test("builds compact context with selected product, suggestions, campaigns, and draft", () => {
    const context = buildVoiceScreenContext({
      page: "campaign",
      products,
      selectedProductId: "prod-cold-brew",
      opportunities,
      currentProductId: "prod-cold-brew",
      campaigns: [
        {
          campaignId: "campaign-1",
          productId: "prod-cold-brew",
          discountPercent: 15,
          quantityLimit: 50,
          imageCount: 1,
          createdAt: "2026-06-07T00:00:00.000Z"
        }
      ],
      currentCampaignDetail: campaignDetail,
      campaignDraft: {
        discountPercent: 20,
        quantityLimit: 40,
        imageVariants: 2,
        aspectRatio: "Square",
        customImagePrompt: "Make it premium."
      },
      activeDialog: "none",
      loading: {
        products: false,
        suggestions: false,
        historyProductId: null,
        campaignId: null,
        campaignGeneration: false,
        imageGeneration: false
      }
    });

    expect(context.selectedProductName).toBe("Cold Brew Concentrate");
    expect(context.products).toEqual([
      expect.objectContaining({
        productId: "prod-cold-brew",
        suggested: true
      }),
      expect.objectContaining({
        productId: "prod-matcha",
        suggested: false
      })
    ]);
    expect(context.opportunities[0]).toMatchObject({
      productId: "prod-cold-brew",
      rank: 1,
      recommendedDiscountPercent: 15
    });
    expect(context.currentCampaign).toMatchObject({
      campaignId: "campaign-1",
      imageCount: 1
    });
    expect(context.campaignDraft).toMatchObject({
      discountPercent: 20,
      quantityLimit: 40
    });
  });
});
