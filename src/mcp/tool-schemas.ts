import { z } from "zod";

export const promoCampaignToolNames = [
  "get_campaign_overview",
  "list_products_for_campaign_review",
  "get_product_campaign_context"
] as const;

export const getCampaignOverviewInputSchema = z.object({}).strict();

export const campaignOverviewSchema = z
  .object({
    totalProducts: z.number().int().nonnegative(),
    totalAvailableStock: z.number().int().nonnegative(),
    unitsSoldThisMonth: z.number().int().nonnegative()
  })
  .strict();

export const listProductsForCampaignReviewInputSchema = z
  .object({
    limit: z.number().int().positive().optional()
  })
  .strict();

export const campaignReviewProductSchema = z
  .object({
    productId: z.string().min(1),
    sku: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    priceCents: z.number().int().nonnegative(),
    availableQuantity: z.number().int().nonnegative(),
    unitsSoldThisMonth: z.number().int().nonnegative(),
    recentSalesSummary: z.string().min(1),
    signalFacts: z.array(z.string().min(1))
  })
  .strict();

export const listProductsForCampaignReviewOutputSchema = z
  .object({
    products: z.array(campaignReviewProductSchema)
  })
  .strict();

export const getProductCampaignContextInputSchema = z
  .object({
    productId: z.string().min(1)
  })
  .strict();

export const recentSaleSchema = z
  .object({
    saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    unitsSold: z.number().int().nonnegative()
  })
  .strict();

export const productCampaignContextSchema = z
  .object({
    product: z
      .object({
        productId: z.string().min(1),
        sku: z.string().min(1),
        name: z.string().min(1),
        category: z.string().min(1),
        priceCents: z.number().int().nonnegative()
      })
      .strict(),
    availableQuantity: z.number().int().nonnegative(),
    unitsSoldThisMonth: z.number().int().nonnegative(),
    recentSales: z.array(recentSaleSchema),
    recentSalesSummary: z.string().min(1),
    signalFacts: z.array(z.string().min(1))
  })
  .strict();

export type GetCampaignOverviewInput = z.infer<
  typeof getCampaignOverviewInputSchema
>;
export type CampaignOverviewPayload = z.infer<typeof campaignOverviewSchema>;
export type ListProductsForCampaignReviewInput = z.infer<
  typeof listProductsForCampaignReviewInputSchema
>;
export type ListProductsForCampaignReviewPayload = z.infer<
  typeof listProductsForCampaignReviewOutputSchema
>;
export type GetProductCampaignContextInput = z.infer<
  typeof getProductCampaignContextInputSchema
>;
export type ProductCampaignContextPayload = z.infer<
  typeof productCampaignContextSchema
>;
