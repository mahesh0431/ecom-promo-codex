import type { CodexGateway } from "@/server/codex/codex-gateway";
import { createCodexGateway } from "@/server/codex/codex-gateway-factory";
import { getProductCampaignContext } from "@/server/campaign-context/campaign-context-service";
import { prisma } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { listProductsForCampaignReview } from "@/server/products/product-service";

type GenerateCampaignInput = {
  userId: string;
  productId: string;
  optionalInstructions?: string | null;
};

export async function findCampaignOpportunitiesForUser(
  userId: string,
  gateway: CodexGateway = createCodexGateway()
) {
  await assertUserExists(userId);

  const products = await listProductsForCampaignReview();
  const result = await gateway.findCampaignOpportunities();
  const productsById = new Map(
    products.map((product) => [product.productId, product])
  );

  const opportunities = result.opportunities.map((opportunity) => {
    const product = productsById.get(opportunity.productId);

    if (!product || product.sku !== opportunity.sku) {
      throw new AppError(
        "CODEX_OUTPUT_ERROR",
        "Codex returned an opportunity for an unknown product.",
        502
      );
    }

    return opportunity;
  });

  return { opportunities };
}

export async function generateCampaignForUser(
  input: GenerateCampaignInput,
  gateway: CodexGateway = createCodexGateway()
) {
  await assertUserExists(input.userId);

  const optionalInstructions = normalizeOptionalInstructions(
    input.optionalInstructions
  );
  const context = await getProductCampaignContext(input.productId);
  const codexResult = await gateway.generateInstagramCampaign({
    productId: input.productId,
    optionalInstructions
  });

  if (codexResult.productId !== input.productId) {
    throw new AppError(
      "CODEX_OUTPUT_ERROR",
      "Codex returned campaign content for the wrong product.",
      502
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      prompt: buildSavedPrompt({
        productName: context.product.name,
        signalFacts: context.signalFacts,
        recentSalesSummary: context.recentSalesSummary,
        optionalInstructions
      }),
      optionalInstructions,
      instagramCaption: codexResult.instagramCaption,
      imagePrompt: codexResult.imagePrompt,
      codexReasoning: codexResult.reasoning
    },
    include: { product: true }
  });

  return toCampaignDto(campaign);
}

export async function listCampaignsForUser(userId: string) {
  await assertUserExists(userId);

  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: true }
  });

  return campaigns.map((campaign) => ({
    campaignId: campaign.id,
    productId: campaign.productId,
    productName: campaign.product.name,
    sku: campaign.product.sku,
    instagramCaption: campaign.instagramCaption,
    imagePrompt: campaign.imagePrompt,
    createdAt: campaign.createdAt.toISOString()
  }));
}

export async function getCampaignForUser(userId: string, campaignId: string) {
  await assertUserExists(userId);

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId
    },
    include: { product: true }
  });

  if (!campaign) {
    throw new AppError("NOT_FOUND", "Campaign not found.", 404);
  }

  return toCampaignDto(campaign);
}

async function assertUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found.", 404);
  }
}

function normalizeOptionalInstructions(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 1000);
}

function buildSavedPrompt(input: {
  productName: string;
  signalFacts: string[];
  recentSalesSummary: string;
  optionalInstructions: string | null;
}) {
  const facts = input.signalFacts.length
    ? input.signalFacts.join("; ")
    : "No special signal facts.";
  const optional = input.optionalInstructions
    ? `Optional instructions: ${input.optionalInstructions}`
    : "Optional instructions: none";

  return [
    `Generate an Instagram campaign for ${input.productName}.`,
    `Recent sales: ${input.recentSalesSummary}.`,
    `Facts: ${facts}.`,
    optional
  ].join("\n");
}

function toCampaignDto(campaign: {
  id: string;
  productId: string;
  product: {
    sku: string;
    name: string;
    category: string;
    priceCents: number;
  };
  prompt: string;
  optionalInstructions: string | null;
  instagramCaption: string;
  imagePrompt: string;
  codexReasoning: string;
  createdAt: Date;
}) {
  return {
    campaignId: campaign.id,
    productId: campaign.productId,
    product: {
      sku: campaign.product.sku,
      name: campaign.product.name,
      category: campaign.product.category,
      priceCents: campaign.product.priceCents
    },
    prompt: campaign.prompt,
    optionalInstructions: campaign.optionalInstructions,
    instagramCaption: campaign.instagramCaption,
    imagePrompt: campaign.imagePrompt,
    codexReasoning: campaign.codexReasoning,
    createdAt: campaign.createdAt.toISOString()
  };
}
