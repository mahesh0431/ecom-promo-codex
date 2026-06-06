import { z } from "zod";

import { codexConfidenceSchema } from "@/server/codex/codex-schemas";

export const opportunityDtoSchema = z
  .object({
    productId: z.string().min(1),
    sku: z.string().min(1),
    signalSummary: z.string().min(1),
    reasoning: z.string().min(1),
    confidence: codexConfidenceSchema
  })
  .strict();

export const generateCampaignRequestSchema = z
  .object({
    productId: z.string().min(1),
    optionalInstructions: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().min(1).optional()
    )
  })
  .strict();

export const campaignProductDtoSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    priceCents: z.number().int().nonnegative()
  })
  .strict();

export const campaignDtoSchema = z
  .object({
    campaignId: z.string().min(1),
    productId: z.string().min(1),
    product: campaignProductDtoSchema,
    prompt: z.string().min(1),
    optionalInstructions: z.string().min(1).nullable(),
    instagramCaption: z.string().min(1).max(2200),
    imagePrompt: z.string().min(1),
    codexReasoning: z.string().min(1),
    createdAt: z.string().datetime()
  })
  .strict();

export const campaignSummaryDtoSchema = z
  .object({
    campaignId: z.string().min(1),
    productId: z.string().min(1),
    productName: z.string().min(1),
    sku: z.string().min(1),
    instagramCaption: z.string().min(1).max(2200),
    imagePrompt: z.string().min(1),
    createdAt: z.string().datetime()
  })
  .strict();
