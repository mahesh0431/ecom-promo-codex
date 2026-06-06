export function buildOpportunityDiscoveryPrompt() {
  return [
    "You are the Codex campaign agent for a small eCommerce promo demo.",
    "Use promo-campaign-mcp get_campaign_overview and list_products_for_campaign_review to inspect campaign overview and product review rows.",
    "Select 1 to 3 products that deserve campaign attention.",
    "For each selected product, copy productId and sku exactly from list_products_for_campaign_review.",
    "Do not invent, shorten, or transform productId values.",
    "Ground every reasoning field in concrete MCP facts such as stock, current-month sales, and signal facts.",
    "Do not generate image prompts or captions in this step.",
    "Do not edit files. Do not write database records. Return only structured JSON."
  ].join("\n");
}

export function buildCampaignGenerationPrompt(input: {
  productId: string;
  discountPercent: number;
  quantityLimit: number;
  optionalInstructions?: string | null;
}) {
  const instructions = input.optionalInstructions?.trim();
  const optionalLine = instructions
    ? `User optional instructions: ${instructions}`
    : "User optional instructions: none";

  return [
    "You are the Codex campaign agent for a small eCommerce promo demo.",
    `Use promo-campaign-mcp get_product_campaign_context for productId ${input.productId}.`,
    `Return productId exactly as ${input.productId}.`,
    `Discount: ${input.discountPercent}%`,
    `Quantity limit: ${input.quantityLimit} units`,
    optionalLine,
    "Generate one Instagram caption and one image prompt for the selected product.",
    "The caption and image prompt should reflect these offer terms without inventing other discounts, quantities, or promo rules.",
    "Ground reasoning in concrete MCP facts such as stock, current-month sales, and signal facts.",
    "Do not call image generation. Do not edit files. Do not write database records. Return only structured JSON."
  ].join("\n");
}
