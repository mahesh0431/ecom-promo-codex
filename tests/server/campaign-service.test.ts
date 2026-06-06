import { beforeEach, describe, expect, test } from "vitest";

import type { CodexGateway } from "@/server/codex/codex-gateway";
import { createFakeCodexGateway } from "@/server/codex/fake-codex-gateway";
import {
  findCampaignOpportunitiesForUser,
  generateCampaignForUser,
  getCampaignForUser,
  listCampaignsForUser
} from "@/server/campaigns/campaign-service";
import { prisma } from "@/server/db/client";
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
      sku: coldBrew.sku
    });
  });

  test("generates and persists a campaign for the authenticated user", async () => {
    const user = await getSeededUser();
    const gateway = createFakeCodexGateway();
    const coldBrew = await getColdBrewProductId();

    const campaign = await generateCampaignForUser(
      {
        userId: user.id,
        productId: coldBrew,
        optionalInstructions: "  Keep it warm and premium.  "
      },
      gateway
    );

    expect(campaign.product.sku).toBe("SKU-COF-COLD-001");
    expect(campaign.optionalInstructions).toBe("Keep it warm and premium.");
    expect(campaign.prompt).toContain("Cold Brew Concentrate");
    expect(campaign.prompt).toContain("Keep it warm and premium.");
    expect(campaign.instagramCaption).toContain("Cold Brew Concentrate");
    expect(campaign.imagePrompt).toContain("Cold Brew Concentrate");

    const stored = await prisma.campaign.findUnique({
      where: { id: campaign.campaignId }
    });
    expect(stored?.userId).toBe(user.id);
    expect(stored?.productId).toBe(coldBrew);
  });

  test("lists and reads only campaigns owned by the user", async () => {
    const user = await getSeededUser();
    const otherUser = await prisma.user.create({
      data: {
        email: "other@promo.test",
        passwordHash: "not-used"
      }
    });
    const gateway = createFakeCodexGateway();
    const coldBrew = await getColdBrewProductId();

    const owned = await generateCampaignForUser(
      { userId: user.id, productId: coldBrew },
      gateway
    );
    await prisma.campaign.create({
      data: {
        userId: otherUser.id,
        productId: coldBrew,
        prompt: "Other user prompt",
        instagramCaption: "Other user caption",
        imagePrompt: "Other user image prompt",
        codexReasoning: "Other user reasoning"
      }
    });

    const campaigns = await listCampaignsForUser(user.id);
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.campaignId).toBe(owned.campaignId);

    await expect(getCampaignForUser(user.id, owned.campaignId)).resolves.toMatchObject({
      campaignId: owned.campaignId
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
        { userId: user.id, productId: "missing-product" },
        gateway
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
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

async function getColdBrewProductId() {
  const products = await listProductsForCampaignReview();
  const coldBrew = products.find(
    (product) => product.sku === "SKU-COF-COLD-001"
  );

  if (!coldBrew) {
    throw new Error("Cold Brew product missing");
  }

  return coldBrew.productId;
}
