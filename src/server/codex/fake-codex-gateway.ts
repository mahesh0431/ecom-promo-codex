import type {
  CampaignGenerationResult,
  OpportunityDiscoveryResult
} from "@/server/codex/codex-types";
import type {
  CodexGateway,
  GenerateInstagramCampaignInput
} from "@/server/codex/codex-gateway";
import { getProductCampaignContext } from "@/server/campaign-context/campaign-context-service";
import { listProductsForCampaignReview } from "@/server/products/product-service";

export function createFakeCodexGateway(): CodexGateway {
  return {
    async findCampaignOpportunities() {
      return findFakeOpportunities();
    },
    async generateInstagramCampaign(input) {
      return generateFakeCampaign(input);
    }
  };
}

async function findFakeOpportunities(): Promise<OpportunityDiscoveryResult> {
  const products = await listProductsForCampaignReview();
  const opportunities = products
    .filter((product) => product.signalFacts.length > 0)
    .slice(0, 3)
    .map((product) => ({
      productId: product.productId,
      sku: product.sku,
      signalSummary: product.signalFacts.join("; "),
      reasoning: `${product.name} has ${product.availableQuantity} units available and ${product.unitsSoldThisMonth} units sold this month. ${product.recentSalesSummary}.`,
      recommendedDiscountPercent: 15,
      recommendedQuantityLimit: Math.min(50, product.availableQuantity),
      confidence: "high" as const
    }));

  return { opportunities };
}

async function generateFakeCampaign(
  input: GenerateInstagramCampaignInput
): Promise<CampaignGenerationResult> {
  const context = await getProductCampaignContext(input.productId);
  const facts = context.signalFacts.join("; ");

  return {
    productId: input.productId,
    instagramCaption: `${context.product.name} is stocked and ready for a fresh ${input.discountPercent}% promo. ${context.recentSalesSummary}. Offer available for the first ${input.quantityLimit} units.`,
    imagePrompt: `A product-focused promotional image of ${context.product.name} with clean retail styling, bright natural light, and a clear ${input.discountPercent}% off offer for ${input.quantityLimit} units.`,
    reasoning: `${context.product.name} is a good promo candidate because MCP context shows ${context.availableQuantity} units available, ${context.unitsSoldThisMonth} units sold this month, and these signal facts: ${facts}. The user-entered offer is ${input.discountPercent}% off for ${input.quantityLimit} units.`
  };
}
