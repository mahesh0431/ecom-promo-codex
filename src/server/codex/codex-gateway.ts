import type {
  CampaignGenerationResult,
  OpportunityDiscoveryResult
} from "@/server/codex/codex-types";

export type GenerateInstagramCampaignInput = {
  productId: string;
  discountPercent: number;
  quantityLimit: number;
  optionalInstructions?: string | null;
};

export type CodexGateway = {
  findCampaignOpportunities(): Promise<OpportunityDiscoveryResult>;
  generateInstagramCampaign(
    input: GenerateInstagramCampaignInput
  ): Promise<CampaignGenerationResult>;
};
