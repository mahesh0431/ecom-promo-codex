import { prisma } from "@/server/db/client";
import { AppError, isAppError } from "@/server/errors";
import { createImageGenerationGateway } from "@/server/images/image-generation-gateway-factory";
import {
  MAX_IMAGE_VARIANTS,
  type GeneratedImage,
  type ImageGenerationGateway
} from "@/server/images/image-generation-gateway";

type GenerateImagesForCampaignInput = {
  userId: string;
  campaignId: string;
  variants?: number;
};

export async function generateImagesForCampaign(
  input: GenerateImagesForCampaignInput,
  gateway?: ImageGenerationGateway
) {
  const campaign = await getOwnedCampaign(input.userId, input.campaignId);
  const variants = normalizeVariants(input.variants);
  const generatedImages = await generateCampaignImageBytes({
    prompt: campaign.imagePrompt,
    variants
  }, gateway);

  const created = await prisma.$transaction(async (tx) => {
    const latest = await tx.campaignImage.findFirst({
      where: { campaignId: campaign.id },
      orderBy: { variantIndex: "desc" },
      select: { variantIndex: true }
    });
    const nextVariantIndex = (latest?.variantIndex ?? 0) + 1;

    return Promise.all(
      generatedImages.map((image, index) =>
        tx.campaignImage.create({
          data: createCampaignImageRecordData({
            campaignId: campaign.id,
            prompt: campaign.imagePrompt,
            image,
            variantIndex: nextVariantIndex + index
          })
        })
      )
    );
  });

  return { images: created.map(toCampaignImageMetadataDto) };
}

export async function generateCampaignImageBytes(
  input: { prompt: string; variants: number },
  gateway?: ImageGenerationGateway
) {
  assertSupportedImageVariantCount(input.variants);

  const imageGateway = gateway ?? createImageGenerationGateway();
  const generatedImages = await generateWithAppErrorMapping(imageGateway, input);

  if (generatedImages.length !== input.variants) {
    throw new AppError(
      "IMAGE_GENERATION_ERROR",
      "Image generation returned an unexpected number of variants.",
      502
    );
  }

  return generatedImages;
}

export function createCampaignImageRecordData(input: {
  campaignId: string;
  prompt: string;
  image: GeneratedImage;
  variantIndex: number;
}) {
  return {
    campaignId: input.campaignId,
    prompt: input.prompt,
    imageData: toPrismaBytes(input.image.bytes),
    mimeType: input.image.mimeType,
    variantIndex: input.variantIndex,
    model: input.image.model,
    size: input.image.size,
    status: "completed"
  };
}

export async function listCampaignImagesForUser(
  userId: string,
  campaignId: string
) {
  await getOwnedCampaign(userId, campaignId);

  const images = await prisma.campaignImage.findMany({
    where: { campaignId },
    orderBy: [{ variantIndex: "asc" }, { createdAt: "asc" }]
  });

  return { images: images.map(toCampaignImageMetadataDto) };
}

export async function getRawCampaignImageForUser(input: {
  userId: string;
  campaignId: string;
  imageId: string;
}) {
  await getOwnedCampaign(input.userId, input.campaignId);

  const image = await prisma.campaignImage.findFirst({
    where: {
      id: input.imageId,
      campaignId: input.campaignId
    }
  });

  if (!image) {
    throw new AppError("NOT_FOUND", "Campaign image not found.", 404);
  }

  return {
    bytes: Buffer.from(image.imageData),
    mimeType: image.mimeType
  };
}

async function getOwnedCampaign(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId
    },
    select: {
      id: true,
      imagePrompt: true
    }
  });

  if (!campaign) {
    throw new AppError("NOT_FOUND", "Campaign not found.", 404);
  }

  return campaign;
}

function normalizeVariants(value: number | undefined) {
  if (!value || value < 1) {
    return 1;
  }

  return Math.min(Math.trunc(value), MAX_IMAGE_VARIANTS);
}

function assertSupportedImageVariantCount(value: number) {
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_IMAGE_VARIANTS
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Image variants must be between 1 and ${MAX_IMAGE_VARIANTS}.`,
      400
    );
  }
}

function toPrismaBytes(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  return bytes;
}

async function generateWithAppErrorMapping(
  gateway: ImageGenerationGateway,
  input: { prompt: string; variants: number }
): Promise<GeneratedImage[]> {
  try {
    return await gateway.generateImages(input);
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw new AppError(
      "IMAGE_GENERATION_ERROR",
      "Image generation failed.",
      502
    );
  }
}

export function toCampaignImageMetadataDto(image: {
  id: string;
  campaignId: string;
  mimeType: string;
  variantIndex: number;
  model: string | null;
  size: string | null;
  status: string;
  createdAt: Date;
}) {
  return {
    imageId: image.id,
    campaignId: image.campaignId,
    variantIndex: image.variantIndex,
    mimeType: image.mimeType,
    model: image.model,
    size: image.size,
    status: image.status,
    createdAt: image.createdAt.toISOString()
  };
}
