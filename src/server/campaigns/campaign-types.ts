import type { z } from "zod";

import type {
  campaignDtoSchema,
  campaignProductDtoSchema,
  campaignSummaryDtoSchema,
  generateCampaignRequestSchema,
  opportunityDtoSchema
} from "./campaign-schemas";

export type OpportunityDto = z.infer<typeof opportunityDtoSchema>;
export type GenerateCampaignRequest = z.infer<
  typeof generateCampaignRequestSchema
>;
export type CampaignProductDto = z.infer<typeof campaignProductDtoSchema>;
export type CampaignDto = z.infer<typeof campaignDtoSchema>;
export type CampaignSummaryDto = z.infer<typeof campaignSummaryDtoSchema>;
