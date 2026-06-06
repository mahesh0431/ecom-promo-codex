import { z } from "zod";

export const codexConfidenceSchema = z.enum(["low", "medium", "high"]);

export const codexOpportunitySchema = z
  .object({
    productId: z.string().min(1),
    sku: z.string().min(1),
    signalSummary: z.string().min(1),
    reasoning: z.string().min(1),
    confidence: codexConfidenceSchema
  })
  .strict();

export const codexOpportunityOutputSchema = z
  .object({
    opportunities: z.array(codexOpportunitySchema).min(1).max(3)
  })
  .strict();

export const codexCampaignOutputSchema = z
  .object({
    productId: z.string().min(1),
    instagramCaption: z.string().min(1).max(2200),
    imagePrompt: z.string().min(1),
    reasoning: z.string().min(1)
  })
  .strict();
