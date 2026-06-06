import {
  hasPromoMcpToolCall,
  SdkCodexGateway
} from "@/server/codex/sdk-codex-gateway";
import { listProductsForCampaignReview } from "@/server/products/product-service";

async function main() {
  if (process.env.RUN_CODEX_LIVE !== "1") {
    console.log("Skipping live Codex smoke. Set RUN_CODEX_LIVE=1 to run it.");
    return;
  }

  const gateway = new SdkCodexGateway({ captureEvidence: true });
  const seededProducts = await listProductsForCampaignReview();
  const seededProductsById = new Map(
    seededProducts.map((product) => [product.productId, product])
  );
  const opportunities = await gateway.findCampaignOpportunities();
  const selected = opportunities.opportunities[0];

  if (!selected) {
    throw new Error("Codex returned no campaign opportunities.");
  }

  if (!hasPromoMcpToolCall(gateway.evidence)) {
    throw new Error(
      `Live smoke did not capture a completed promo-campaign-mcp tool call. Evidence: ${JSON.stringify(
        gateway.evidence.mcpToolCalls
      )}`
    );
  }

  if (!seededProductsById.has(selected.productId)) {
    throw new Error(
      `Codex returned an opportunity for an unknown product: ${selected.productId}. Evidence: ${JSON.stringify(
        gateway.evidence.mcpToolCalls
      )}`
    );
  }

  const campaign = await gateway.generateInstagramCampaign({
    productId: selected.productId
  });

  console.log("Live Codex smoke passed.");
  console.log(
    JSON.stringify(
      {
        sandboxMode: process.env.CODEX_SANDBOX_MODE ?? "read-only",
        opportunities: opportunities.opportunities.map((opportunity) => ({
          productId: opportunity.productId,
          sku: opportunity.sku,
          confidence: opportunity.confidence
        })),
        generatedCampaign: {
          productId: campaign.productId,
          instagramCaption: campaign.instagramCaption.slice(0, 140),
          imagePrompt: campaign.imagePrompt.slice(0, 140)
        },
        mcpToolCalls: gateway.evidence.mcpToolCalls
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
