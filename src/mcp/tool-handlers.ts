import { getProductCampaignContext } from "@/server/campaign-context/campaign-context-service";
import {
  getProductOverview,
  listProductsForCampaignReview
} from "@/server/products/product-service";

import {
  campaignOverviewSchema,
  getProductCampaignContextInputSchema,
  listProductsForCampaignReviewInputSchema,
  listProductsForCampaignReviewOutputSchema,
  productCampaignContextSchema,
  type CampaignOverviewPayload,
  type GetProductCampaignContextInput,
  type ListProductsForCampaignReviewInput,
  type ListProductsForCampaignReviewPayload,
  type ProductCampaignContextPayload
} from "./tool-schemas";

export async function handleGetCampaignOverview(): Promise<CampaignOverviewPayload> {
  return campaignOverviewSchema.parse(await getProductOverview());
}

export async function handleListProductsForCampaignReview(
  input: ListProductsForCampaignReviewInput = {}
): Promise<ListProductsForCampaignReviewPayload> {
  const parsed = listProductsForCampaignReviewInputSchema.parse(input);
  const products = await listProductsForCampaignReview();
  const limitedProducts =
    parsed.limit === undefined ? products : products.slice(0, parsed.limit);

  return listProductsForCampaignReviewOutputSchema.parse({
    products: limitedProducts
  });
}

export async function handleGetProductCampaignContext(
  input: GetProductCampaignContextInput
): Promise<ProductCampaignContextPayload> {
  const parsed = getProductCampaignContextInputSchema.parse(input);

  return productCampaignContextSchema.parse(
    await getProductCampaignContext(parsed.productId)
  );
}
