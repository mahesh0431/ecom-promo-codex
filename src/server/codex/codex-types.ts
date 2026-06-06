import type { z } from "zod";

import type {
  codexCampaignOutputSchema,
  codexConfidenceSchema,
  codexOpportunityOutputSchema,
  codexOpportunitySchema
} from "./codex-schemas";

export type CodexConfidence = z.infer<typeof codexConfidenceSchema>;
export type CodexOpportunity = z.infer<typeof codexOpportunitySchema>;
export type CodexOpportunityOutput = z.infer<
  typeof codexOpportunityOutputSchema
>;
export type CodexCampaignOutput = z.infer<typeof codexCampaignOutputSchema>;
export type OpportunityDiscoveryResult = CodexOpportunityOutput;
export type CampaignGenerationResult = CodexCampaignOutput;
