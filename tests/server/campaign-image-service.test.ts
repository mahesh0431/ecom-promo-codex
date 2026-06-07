import { beforeEach, describe, expect, test } from "vitest";

import { generateImagesForCampaign } from "@/server/images/campaign-image-service";
import { createFakeImageGenerationGateway } from "@/server/images/fake-image-generation-gateway";
import { prisma } from "@/server/db/client";
import { listProductsForCampaignReview } from "@/server/products/product-service";

describe("campaign image service", () => {
  beforeEach(async () => {
    process.env.IMAGE_GENERATION_MODE = "fake";
    await prisma.campaignImage.deleteMany();
    await prisma.campaign.deleteMany();
  });

  test("generates image metadata from the saved campaign image prompt", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id, {
      imagePrompt: "Saved prompt only"
    });
    const gateway = createFakeImageGenerationGateway();

    const result = await generateImagesForCampaign(
      {
        userId: user.id,
        campaignId: campaign.id,
        variants: 2
      },
      gateway
    );

    expect(result.images).toHaveLength(2);
    expect(result.images[0]).toMatchObject({
      campaignId: campaign.id,
      variantIndex: 1,
      mimeType: "image/jpeg",
      model: "fake-gpt-image-2",
      size: "1024x1024",
      status: "completed"
    });
    expect(result.images[0]).not.toHaveProperty("imageData");

    const stored = await prisma.campaignImage.findMany({
      where: { campaignId: campaign.id },
      orderBy: { variantIndex: "asc" }
    });
    expect(stored).toHaveLength(2);
    expect(stored[0]?.prompt).toBe("Saved prompt only");
    expect(Buffer.from(stored[0]?.imageData ?? []).length).toBeGreaterThan(0);
    expect(stored[0]?.variantIndex).toBe(1);
    expect(stored[1]?.variantIndex).toBe(2);
  });

  test("adds custom image direction to regenerated image prompts", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id, {
      imagePrompt: "Saved prompt only"
    });
    const prompts: string[] = [];

    const result = await generateImagesForCampaign(
      {
        userId: user.id,
        campaignId: campaign.id,
        variants: 1,
        customInstructions: "  Use a darker premium background.  "
      },
      {
        async generateImages(input) {
          prompts.push(input.prompt);

          return Array.from({ length: input.variants }, () => ({
            bytes: Buffer.from("fake-image"),
            mimeType: "image/jpeg",
            model: "test-image-model",
            size: "1024x1024"
          }));
        }
      }
    );

    expect(result.images).toHaveLength(1);
    expect(prompts).toEqual([
      "Saved prompt only\n\nAdditional image direction: Use a darker premium background."
    ]);

    const stored = await prisma.campaignImage.findFirstOrThrow({
      where: { campaignId: campaign.id }
    });
    expect(stored.prompt).toBe(prompts[0]);
  });

  test("appends variant indexes across repeated generations", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id);
    const gateway = createFakeImageGenerationGateway();

    await generateImagesForCampaign(
      { userId: user.id, campaignId: campaign.id, variants: 2 },
      gateway
    );
    const second = await generateImagesForCampaign(
      { userId: user.id, campaignId: campaign.id, variants: 1 },
      gateway
    );

    expect(second.images).toHaveLength(1);
    expect(second.images[0]?.variantIndex).toBe(3);
  });

  test("rejects campaigns owned by another user", async () => {
    const user = await getSeededUser();
    const otherUser = await prisma.user.create({
      data: {
        email: "image-other@promo.test",
        passwordHash: "not-used"
      }
    });
    const campaign = await createCampaign(user.id);

    await expect(
      generateImagesForCampaign({
        userId: otherUser.id,
        campaignId: campaign.id,
        variants: 1
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("returns unavailable when live mode is missing the OpenAI API key", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id);
    const previousMode = process.env.IMAGE_GENERATION_MODE;
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.IMAGE_GENERATION_MODE = "openai";
    delete process.env.OPENAI_API_KEY;

    try {
      await expect(
        generateImagesForCampaign({
          userId: user.id,
          campaignId: campaign.id,
          variants: 1
        })
      ).rejects.toMatchObject({
        code: "IMAGE_GENERATION_UNAVAILABLE",
        status: 503
      });
    } finally {
      if (previousMode) {
        process.env.IMAGE_GENERATION_MODE = previousMode;
      } else {
        delete process.env.IMAGE_GENERATION_MODE;
      }
      if (previousKey) {
        process.env.OPENAI_API_KEY = previousKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  test("maps gateway failures and does not create partial image rows", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id);

    await expect(
      generateImagesForCampaign(
        {
          userId: user.id,
          campaignId: campaign.id,
          variants: 1
        },
        {
          async generateImages() {
            throw new Error("provider exploded");
          }
        }
      )
    ).rejects.toMatchObject({
      code: "IMAGE_GENERATION_ERROR",
      status: 502
    });
    await expect(prisma.campaignImage.count()).resolves.toBe(0);
  });

  test("normalizes variants to the supported range", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id);
    const gateway = createFakeImageGenerationGateway();

    const zero = await generateImagesForCampaign(
      { userId: user.id, campaignId: campaign.id, variants: 0 },
      gateway
    );
    const tooMany = await generateImagesForCampaign(
      { userId: user.id, campaignId: campaign.id, variants: 9 },
      gateway
    );

    expect(zero.images).toHaveLength(1);
    expect(tooMany.images).toHaveLength(2);
  });
});

async function getSeededUser() {
  const user = await prisma.user.findUnique({
    where: { email: "demo@promo.test" }
  });

  if (!user) {
    throw new Error("Seeded user missing");
  }

  return user;
}

async function createCampaign(
  userId: string,
  input: { imagePrompt?: string } = {}
) {
  const products = await listProductsForCampaignReview();
  const product = products[0];

  if (!product) {
    throw new Error("Seeded product missing");
  }

  return prisma.campaign.create({
    data: {
      userId,
      productId: product.productId,
      discountPercent: 15,
      quantityLimit: 50,
      initialImageVariantsRequested: 1,
      prompt: "Campaign prompt",
      instagramCaption: "Caption",
      imagePrompt: input.imagePrompt ?? "Saved image prompt",
      codexReasoning: "Reasoning"
    }
  });
}
