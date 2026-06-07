import type {
  CampaignDto,
  CampaignSummaryDto
} from "@/server/campaigns/campaign-types";
import type { VoiceCampaignDraft, VoiceCommandResult } from "./voice-types";

export type CampaignImageDto = {
  imageId: string;
  campaignId: string;
  variantIndex: number;
  mimeType: string;
  model: string | null;
  size: string | null;
  status: string;
  createdAt: string;
};

export type CampaignDetailDto = {
  campaign: CampaignDto;
  images: CampaignImageDto[];
};

export type PromoWorkflowCommands = {
  getContext: () => VoiceCommandResult["context"];
  openProduct: (reference: string) => Promise<VoiceCommandResult>;
  navigateBack: () => Promise<VoiceCommandResult>;
  generatePromotionSuggestions: () => Promise<VoiceCommandResult>;
  openRecommendation: (reference: string) => Promise<VoiceCommandResult>;
  createCampaignForProduct: (reference?: string) => Promise<VoiceCommandResult>;
  setCampaignOffer: (
    draft: Partial<VoiceCampaignDraft>
  ) => Promise<VoiceCommandResult>;
  generateCampaign: () => Promise<VoiceCommandResult>;
  openAdditionalImageDialog: () => Promise<VoiceCommandResult>;
  generateAnotherImage: (
    customDirection?: string
  ) => Promise<VoiceCommandResult>;
  closeDialog: () => Promise<VoiceCommandResult>;
};

export type CampaignHistoryByProduct = Record<string, CampaignSummaryDto[]>;
