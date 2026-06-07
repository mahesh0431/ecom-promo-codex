import type { CampaignDetailDto } from "@/app/voice/workflow-command-types";
import type {
  VoiceActiveDialog,
  VoiceCampaignDraft,
  VoiceCampaignSource,
  VoiceProductSource,
  VoiceScreenContext
} from "@/app/voice/voice-types";
import type { OpportunityDto } from "@/server/campaigns/campaign-types";

export function buildVoiceScreenContext(input: {
  page: VoiceScreenContext["page"];
  products: VoiceProductSource[];
  selectedProductId: string | null;
  opportunities: OpportunityDto[];
  currentProductId: string | null;
  campaigns: VoiceCampaignSource[];
  currentCampaignDetail: CampaignDetailDto | null;
  campaignDraft: VoiceCampaignDraft | null;
  activeDialog: VoiceActiveDialog;
  loading: VoiceScreenContext["loading"];
}): VoiceScreenContext {
  const opportunitiesByProductId = new Map(
    input.opportunities.map((opportunity, index) => [
      opportunity.productId,
      { ...opportunity, rank: index + 1 }
    ])
  );
  const products = input.products.map((product) => ({
    productId: product.productId,
    name: product.name,
    sku: product.sku,
    category: product.category,
    priceCents: product.priceCents,
    availableQuantity: product.availableQuantity,
    unitsSoldThisMonth: product.unitsSoldThisMonth,
    suggested: opportunitiesByProductId.has(product.productId)
  }));
  const productsById = new Map(
    products.map((product) => [product.productId, product])
  );
  const currentProduct = input.currentProductId
    ? productsById.get(input.currentProductId) ?? null
    : null;
  const selectedProduct = input.selectedProductId
    ? productsById.get(input.selectedProductId) ?? null
    : null;

  return {
    page: input.page,
    selectedProductId: input.selectedProductId,
    selectedProductName: selectedProduct?.name ?? null,
    activeDialog: input.activeDialog,
    loading: input.loading,
    products,
    opportunities: input.opportunities.map((opportunity, index) => ({
      productId: opportunity.productId,
      sku: opportunity.sku,
      productName:
        productsById.get(opportunity.productId)?.name ?? opportunity.sku,
      rank: index + 1,
      confidence: opportunity.confidence,
      reasoning: opportunity.reasoning,
      recommendedDiscountPercent: opportunity.recommendedDiscountPercent,
      recommendedQuantityLimit: opportunity.recommendedQuantityLimit
    })),
    currentProduct,
    campaigns: input.campaigns.map((campaign) => ({
      campaignId: campaign.campaignId,
      productId: campaign.productId,
      createdAt: campaign.createdAt,
      discountPercent: campaign.discountPercent,
      quantityLimit: campaign.quantityLimit,
      imageCount: campaign.imageCount
    })),
    currentCampaign: input.currentCampaignDetail
      ? {
          campaignId: input.currentCampaignDetail.campaign.campaignId,
          productId: input.currentCampaignDetail.campaign.productId,
          hasCaption: Boolean(
            input.currentCampaignDetail.campaign.instagramCaption
          ),
          hasImagePrompt: Boolean(
            input.currentCampaignDetail.campaign.imagePrompt
          ),
          imageCount: input.currentCampaignDetail.images.length
        }
      : null,
    campaignDraft: input.campaignDraft
  };
}
