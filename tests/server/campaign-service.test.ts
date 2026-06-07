import { beforeEach, describe, expect, test } from "vitest";

import type { CodexGateway } from "@/server/codex/codex-gateway";
import { createFakeCodexGateway } from "@/server/codex/fake-codex-gateway";
import {
  createCampaignForUser,
  findCampaignOpportunitiesForUser,
  generateCampaignForUser,
  getCampaignForUser,
  listCampaignsForUser
} from "@/server/campaigns/campaign-service";
import { prisma } from "@/server/db/client";
import { createFakeImageGenerationGateway } from "@/server/images/fake-image-generation-gateway";
import { listProductsForCampaignReview } from "@/server/products/product-service";

describe("campaign service", () => {
  beforeEach(async () => {
    await prisma.campaignImage.deleteMany();
    await prisma.campaign.deleteMany();
  });

  test("finds Codex opportunities without persisting campaigns", async () => {
    const user = await getSeededUser();
    const gateway = createFakeCodexGateway();

    const result = await findCampaignOpportunitiesForUser(user.id, gateway);

    expect(result.opportunities).toHaveLength(3);
    expect(result.opportunities[0]).toMatchObject({
      sku: "SKU-COF-COLD-001",
      recommendedDiscountPercent: 15,
      recommendedQuantityLimit: 50,
      confidence: "high"
    });
    expect(result.opportunities[0]?.reasoning).toContain("180 units");
    await expect(prisma.campaign.count()).resolves.toBe(0);
  });

  test("canonicalizes opportunity product ids from matching SKUs", async () => {
    const user = await getSeededUser();
    const products = await listProductsForCampaignReview();
    const coldBrew = products.find(
      (product) => product.sku === "SKU-COF-COLD-001"
    );

    if (!coldBrew) {
      throw new Error("Cold Brew product missing");
    }

    const gateway: CodexGateway = {
      async findCampaignOpportunities() {
        return {
          opportunities: [
            {
              productId: "invented-product-id",
              sku: coldBrew.sku,
              signalSummary: "High stock and low current-month sales.",
              reasoning:
                "MCP shows 180 units available and only 3 units sold this month.",
              recommendedDiscountPercent: 20,
              recommendedQuantityLimit: coldBrew.availableQuantity + 100,
              confidence: "high"
            }
          ]
        };
      },
      async generateInstagramCampaign() {
        throw new Error("Not used in this test.");
      }
    };

    const result = await findCampaignOpportunitiesForUser(user.id, gateway);

    expect(result.opportunities[0]).toMatchObject({
      productId: coldBrew.productId,
      sku: coldBrew.sku,
      recommendedDiscountPercent: 20,
      recommendedQuantityLimit: coldBrew.availableQuantity
    });
  });

  test("generates and persists a campaign for the authenticated user", async () => {
    const user = await getSeededUser();
    const codexGateway = createFakeCodexGateway();
    const imageGateway = createFakeImageGenerationGateway();
    const coldBrew = await getColdBrewProduct();

    const result = await generateCampaignForUser(
      {
        userId: user.id,
        productId: coldBrew.productId,
        discountPercent: 15,
        quantityLimit: 80,
        imageVariants: 2,
        optionalInstructions: "  Keep it warm and premium.  "
      },
      codexGateway,
      imageGateway
    );
    const { campaign, images } = result;

    expect(campaign.product.sku).toBe("SKU-COF-COLD-001");
    expect(campaign.discountPercent).toBe(15);
    expect(campaign.quantityLimit).toBe(80);
    expect(campaign.initialImageVariantsRequested).toBe(2);
    expect(campaign.optionalInstructions).toBe("Keep it warm and premium.");
    expect(campaign.prompt).toContain("Cold Brew Concentrate");
    expect(campaign.prompt).toContain("Discount: 15%");
    expect(campaign.prompt).toContain("Quantity limit: 80 units");
    expect(campaign.prompt).toContain("Keep it warm and premium.");
    expect(campaign.instagramCaption).toContain("Cold Brew Concentrate");
    expect(campaign.instagramCaption).toContain("15%");
    expect(campaign.imagePrompt).toContain("Cold Brew Concentrate");
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({
      campaignId: campaign.campaignId,
      variantIndex: 1,
      mimeType: "image/jpeg",
      status: "completed"
    });
    expect(images[0]).not.toHaveProperty("imageData");

    const stored = await prisma.campaign.findUnique({
      where: { id: campaign.campaignId },
      include: { images: { orderBy: { variantIndex: "asc" } } }
    });
    expect(stored?.userId).toBe(user.id);
    expect(stored?.productId).toBe(coldBrew.productId);
    expect(stored?.discountPercent).toBe(15);
    expect(stored?.quantityLimit).toBe(80);
    expect(stored?.initialImageVariantsRequested).toBe(2);
    expect(stored?.images).toHaveLength(2);
  });

  test("creates and persists an agent-authored campaign without backend Codex", async () => {
    const user = await getSeededUser();
    const imageGateway = createFakeImageGenerationGateway();
    const coldBrew = await getColdBrewProduct();

    const result = await createCampaignForUser(
      {
        userId: user.id,
        productId: coldBrew.productId,
        discountPercent: 25,
        quantityLimit: 60,
        imageVariants: 1,
        instagramCaption:
          "Cold Brew Concentrate is 25% off for the first 60 units.",
        imagePrompt:
          "Square Instagram product image for Cold Brew Concentrate with clear 25% off and limit 60 units text.",
        reasoning:
          "High available stock and low current-month sales make this the top promo candidate.",
        optionalInstructions: "  Make it feel crisp and summer-ready.  "
      },
      imageGateway
    );

    expect(result.campaign).toMatchObject({
      productId: coldBrew.productId,
      discountPercent: 25,
      quantityLimit: 60,
      initialImageVariantsRequested: 1,
      instagramCaption:
        "Cold Brew Concentrate is 25% off for the first 60 units.",
      imagePrompt:
        "Square Instagram product image for Cold Brew Concentrate with clear 25% off and limit 60 units text.",
      codexReasoning:
        "High available stock and low current-month sales make this the top promo candidate.",
      optionalInstructions: "Make it feel crisp and summer-ready."
    });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toMatchObject({
      campaignId: result.campaign.campaignId,
      variantIndex: 1,
      mimeType: "image/jpeg"
    });

    const stored = await prisma.campaign.findUnique({
      where: { id: result.campaign.campaignId },
      include: { images: true }
    });
    expect(stored?.codexReasoning).toContain("top promo candidate");
    expect(stored?.images[0]?.prompt).toContain("Square Instagram");
  });

  test("accepts a 100 percent discount", async () => {
    const user = await getSeededUser();
    const codexGateway = createFakeCodexGateway();
    const imageGateway = createFakeImageGenerationGateway();
    const coldBrew = await getColdBrewProduct();

    const { campaign } = await generateCampaignForUser(
      {
        userId: user.id,
        productId: coldBrew.productId,
        discountPercent: 100,
        quantityLimit: 10,
        imageVariants: 1
      },
      codexGateway,
      imageGateway
    );

    expect(campaign.discountPercent).toBe(100);
    expect(campaign.prompt).toContain("Discount: 100%");
  });

  test("lists and reads only campaigns owned by the user", async () => {
    const user = await getSeededUser();
    const otherUser = await prisma.user.create({
      data: {
        email: "other@promo.test",
        passwordHash: "not-used"
      }
    });
    const codexGateway = createFakeCodexGateway();
    const imageGateway = createFakeImageGenerationGateway();
    const coldBrew = await getColdBrewProduct();

    const result = await generateCampaignForUser(
      {
        userId: user.id,
        productId: coldBrew.productId,
        discountPercent: 20,
        quantityLimit: 50,
        imageVariants: 1
      },
      codexGateway,
      imageGateway
    );
    const owned = result.campaign;
    await prisma.campaign.create({
      data: {
        userId: otherUser.id,
        productId: coldBrew.productId,
        discountPercent: 10,
        quantityLimit: 25,
        initialImageVariantsRequested: 1,
        prompt: "Other user prompt",
        instagramCaption: "Other user caption",
        imagePrompt: "Other user image prompt",
        codexReasoning: "Other user reasoning"
      }
    });

    const campaigns = await listCampaignsForUser(user.id);
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.campaignId).toBe(owned.campaignId);
    expect(campaigns[0]).toMatchObject({
      discountPercent: 20,
      quantityLimit: 50,
      initialImageVariantsRequested: 1,
      imageCount: 1
    });

    const filtered = await listCampaignsForUser(user.id, {
      productId: coldBrew.productId
    });
    expect(filtered).toHaveLength(1);

    await expect(
      getCampaignForUser(user.id, owned.campaignId)
    ).resolves.toMatchObject({
      campaign: {
        campaignId: owned.campaignId,
        discountPercent: 20,
        quantityLimit: 50
      },
      images: [{ campaignId: owned.campaignId, variantIndex: 1 }]
    });
    await expect(getCampaignForUser(otherUser.id, owned.campaignId)).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
  });

  test("rejects missing products before asking Codex to generate", async () => {
    const user = await getSeededUser();
    const gateway = createFakeCodexGateway();

    await expect(
      generateCampaignForUser(
        {
          userId: user.id,
          productId: "missing-product",
          discountPercent: 15,
          quantityLimit: 1,
          imageVariants: 1
        },
        gateway
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("rejects quantity limits above available stock", async () => {
    const user = await getSeededUser();
    const gateway = createFakeCodexGateway();
    const coldBrew = await getColdBrewProduct();

    await expect(
      generateCampaignForUser(
        {
          userId: user.id,
          productId: coldBrew.productId,
          discountPercent: 15,
          quantityLimit: coldBrew.availableQuantity + 1,
          imageVariants: 1
        },
        gateway
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR"
    });
  });

  test("rejects discount percentages above 100", async () => {
    const user = await getSeededUser();
    const gateway = createFakeCodexGateway();
    const coldBrew = await getColdBrewProduct();

    await expect(
      generateCampaignForUser(
        {
          userId: user.id,
          productId: coldBrew.productId,
          discountPercent: 101,
          quantityLimit: 10,
          imageVariants: 1
        },
        gateway
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR"
    });
  });

  test("does not save a campaign when initial image generation fails", async () => {
    const user = await getSeededUser();
    const codexGateway = createFakeCodexGateway();
    const coldBrew = await getColdBrewProduct();

    await expect(
      generateCampaignForUser(
        {
          userId: user.id,
          productId: coldBrew.productId,
          discountPercent: 15,
          quantityLimit: 80,
          imageVariants: 1
        },
        codexGateway,
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
    await expect(prisma.campaign.count()).resolves.toBe(0);
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

async function getColdBrewProduct() {
  const products = await listProductsForCampaignReview();
  const coldBrew = products.find(
    (product) => product.sku === "SKU-COF-COLD-001"
  );

  if (!coldBrew) {
    throw new Error("Cold Brew product missing");
  }

  return coldBrew;
}
