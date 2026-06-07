import type {
  CampaignSummaryDto,
  OpportunityDto
} from "@/server/campaigns/campaign-types";
import type { ProductForCampaignReview } from "@/server/products/product-types";

export type VoicePageKind = "dashboard" | "product" | "campaign";

export type VoiceActiveDialog =
  | "none"
  | "promotion_suggestions"
  | "recommendation"
  | "campaign_generation"
  | "additional_image"
  | "image_preview";

export type VoiceCampaignDraft = {
  discountPercent: number;
  quantityLimit: number;
  imageVariants: 1 | 2;
  aspectRatio: "Square" | "Portrait" | "Landscape";
  customImagePrompt: string;
};

export type VoiceScreenContext = {
  page: VoicePageKind;
  selectedProductId: string | null;
  selectedProductName: string | null;
  activeDialog: VoiceActiveDialog;
  loading: {
    products: boolean;
    suggestions: boolean;
    historyProductId: string | null;
    campaignId: string | null;
    campaignGeneration: boolean;
    imageGeneration: boolean;
  };
  products: VoiceProductSummary[];
  opportunities: VoiceOpportunitySummary[];
  currentProduct: VoiceProductSummary | null;
  campaigns: VoiceCampaignSummary[];
  currentCampaign: VoiceCampaignContext | null;
  campaignDraft: VoiceCampaignDraft | null;
};

export type VoiceProductSummary = {
  productId: string;
  name: string;
  sku: string;
  category: string;
  priceCents: number;
  availableQuantity: number;
  unitsSoldThisMonth: number;
  suggested: boolean;
};

export type VoiceOpportunitySummary = {
  productId: string;
  sku: string;
  productName: string;
  rank: number;
  confidence: OpportunityDto["confidence"];
  reasoning: string;
  recommendedDiscountPercent: number;
  recommendedQuantityLimit: number;
};

export type VoiceCampaignSummary = {
  campaignId: string;
  productId: string;
  createdAt: string;
  discountPercent: number;
  quantityLimit: number;
  imageCount: number;
};

export type VoiceCampaignContext = {
  campaignId: string;
  productId: string;
  hasCaption: boolean;
  hasImagePrompt: boolean;
  imageCount: number;
};

export type VoiceCommandResult = {
  ok: boolean;
  message: string;
  context?: VoiceScreenContext;
};

export type VoiceProductSource = Pick<
  ProductForCampaignReview,
  | "productId"
  | "name"
  | "sku"
  | "category"
  | "priceCents"
  | "availableQuantity"
  | "unitsSoldThisMonth"
>;

export type VoiceCampaignSource = Pick<
  CampaignSummaryDto,
  | "campaignId"
  | "productId"
  | "createdAt"
  | "discountPercent"
  | "quantityLimit"
  | "imageCount"
>;

export type ProductResolution =
  | { kind: "matched"; product: VoiceProductSummary }
  | { kind: "ambiguous"; matches: VoiceProductSummary[] }
  | { kind: "missing" };
