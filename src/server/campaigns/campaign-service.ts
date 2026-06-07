import type { CodexGateway } from "@/server/codex/codex-gateway";
import { createCodexGateway } from "@/server/codex/codex-gateway-factory";
import { getProductCampaignContext } from "@/server/campaign-context/campaign-context-service";
import { prisma } from "@/server/db/client";
import { AppError } from "@/server/errors";
import {
  createCampaignImageRecordData,
  generateCampaignImageBytes,
  toCampaignImageMetadataDto
} from "@/server/images/campaign-image-service";
import {
  MAX_IMAGE_VARIANTS,
  type ImageGenerationGateway
} from "@/server/images/image-generation-gateway";
import { listProductsForCampaignReview } from "@/server/products/product-service";

type GenerateCampaignInput = {
  userId: string;
  productId: string;
  discountPercent: number;
  quantityLimit: number;
  imageVariants: number;
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
  const productsBySku = new Map(products.map((product) => [product.sku, product]));

  const opportunities = result.opportunities.map((opportunity) => {
    const product =
      productsById.get(opportunity.productId) ?? productsBySku.get(opportunity.sku);

    if (!product || product.sku !== opportunity.sku) {
      throw new AppError(
        "CODEX_OUTPUT_ERROR",
        "Codex returned an opportunity for an unknown product.",
        502
      );
    }

    return {
      ...opportunity,
      productId: product.productId,
      sku: product.sku,
      recommendedQuantityLimit: Math.min(
        opportunity.recommendedQuantityLimit,
        product.availableQuantity
      )
    };
  });

  return { opportunities };
}

export async function generateCampaignForUser(
  input: GenerateCampaignInput,
  gateway: CodexGateway = createCodexGateway(),
  imageGateway?: ImageGenerationGateway
) {
  await assertUserExists(input.userId);
  assertCampaignCreationInput(input);

  const optionalInstructions = normalizeOptionalInstructions(
    input.optionalInstructions
  );
  const context = await getProductCampaignContext(input.productId);
  assertQuantityLimitFitsStock(input.quantityLimit, context.availableQuantity);
  const codexResult = await gateway.generateInstagramCampaign({
    productId: input.productId,
    discountPercent: input.discountPercent,
    quantityLimit: input.quantityLimit,
    optionalInstructions
  });

  if (codexResult.productId !== input.productId) {
    throw new AppError(
      "CODEX_OUTPUT_ERROR",
      "Codex returned campaign content for the wrong product.",
      502
    );
  }

  const generatedImages = await generateCampaignImageBytes({
    prompt: codexResult.imagePrompt,
    variants: input.imageVariants
  }, imageGateway);

  const created = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        userId: input.userId,
        productId: input.productId,
        prompt: buildSavedPrompt({
          productName: context.product.name,
          signalFacts: context.signalFacts,
          recentSalesSummary: context.recentSalesSummary,
          discountPercent: input.discountPercent,
          quantityLimit: input.quantityLimit,
          optionalInstructions
        }),
        optionalInstructions,
        discountPercent: input.discountPercent,
        quantityLimit: input.quantityLimit,
        initialImageVariantsRequested: input.imageVariants,
        instagramCaption: codexResult.instagramCaption,
        imagePrompt: codexResult.imagePrompt,
        codexReasoning: codexResult.reasoning
      },
      include: { product: true }
    });
    const images = await Promise.all(
      generatedImages.map((image, index) =>
        tx.campaignImage.create({
          data: createCampaignImageRecordData({
            campaignId: campaign.id,
            prompt: codexResult.imagePrompt,
            image,
            variantIndex: index + 1
          })
        })
      )
    );

    return { campaign, images };
  });

  return {
    campaign: toCampaignDto(created.campaign),
    images: created.images.map(toCampaignImageMetadataDto)
  };
}

export async function listCampaignsForUser(
  userId: string,
  input: { productId?: string } = {}
) {
  await assertUserExists(userId);

  const campaigns = await prisma.campaign.findMany({
    where: {
      userId,
      ...(input.productId ? { productId: input.productId } : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      product: true,
      _count: { select: { images: true } }
    }
  });

  return campaigns.map((campaign) => ({
    campaignId: campaign.id,
    productId: campaign.productId,
    productName: campaign.product.name,
    sku: campaign.product.sku,
    discountPercent: campaign.discountPercent,
    quantityLimit: campaign.quantityLimit,
    initialImageVariantsRequested: campaign.initialImageVariantsRequested,
    instagramCaption: campaign.instagramCaption,
    imagePrompt: campaign.imagePrompt,
    imageCount: campaign._count.images,
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
    include: {
      product: true,
      images: { orderBy: [{ variantIndex: "asc" }, { createdAt: "asc" }] }
    }
  });

  if (!campaign) {
    throw new AppError("NOT_FOUND", "Campaign not found.", 404);
  }

  return {
    campaign: toCampaignDto(campaign),
    images: campaign.images.map(toCampaignImageMetadataDto)
  };
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

function assertCampaignCreationInput(input: GenerateCampaignInput) {
  if (
    !Number.isInteger(input.discountPercent) ||
    input.discountPercent < 1 ||
    input.discountPercent > 100
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Discount percent must be an integer from 1 to 100.",
      400
    );
  }

  if (!Number.isInteger(input.quantityLimit) || input.quantityLimit < 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Quantity limit must be a positive integer.",
      400
    );
  }

  if (
    !Number.isInteger(input.imageVariants) ||
    input.imageVariants < 1 ||
    input.imageVariants > MAX_IMAGE_VARIANTS
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Image variants must be between 1 and ${MAX_IMAGE_VARIANTS}.`,
      400
    );
  }
}

function assertQuantityLimitFitsStock(
  quantityLimit: number,
  availableQuantity: number
) {
  if (quantityLimit > availableQuantity) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Quantity limit cannot exceed available stock.",
      400
    );
  }
}

function buildSavedPrompt(input: {
  productName: string;
  signalFacts: string[];
  recentSalesSummary: string;
  discountPercent: number;
  quantityLimit: number;
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
    `Discount: ${input.discountPercent}%.`,
    `Quantity limit: ${input.quantityLimit} units.`,
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
  discountPercent: number;
  quantityLimit: number;
  initialImageVariantsRequested: number;
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
    discountPercent: campaign.discountPercent,
    quantityLimit: campaign.quantityLimit,
    initialImageVariantsRequested: campaign.initialImageVariantsRequested,
    instagramCaption: campaign.instagramCaption,
    imagePrompt: campaign.imagePrompt,
    codexReasoning: campaign.codexReasoning,
    createdAt: campaign.createdAt.toISOString()
  };
}
