import { beforeEach, describe, expect, test } from "vitest";

import { POST as findOpportunities } from "@/app/api/campaign-opportunities/route";
import {
  GET as listCampaigns,
  POST as createCampaign
} from "@/app/api/campaigns/route";
import { POST as generateCampaign } from "@/app/api/campaigns/generate/route";
import { GET as getCampaign } from "@/app/api/campaigns/[campaignId]/route";
import { createSession } from "@/server/auth/session-service";
import { prisma } from "@/server/db/client";
import { getServerEnv } from "@/server/env";
import { listProductsForCampaignReview } from "@/server/products/product-service";

describe("campaign routes", () => {
  beforeEach(async () => {
    process.env.CODEX_GATEWAY = "fake";
    process.env.IMAGE_GENERATION_MODE = "fake";
    await prisma.campaignImage.deleteMany();
    await prisma.campaign.deleteMany();
  });

  test("rejects unauthenticated opportunity discovery", async () => {
    const response = await findOpportunities(
      new Request("http://localhost/api/campaign-opportunities", {
        method: "POST"
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" }
    });
    expect(response.status).toBe(401);
  });

  test("returns opportunities for an authenticated user without persisting", async () => {
    const request = await authenticatedRequest(
      "http://localhost/api/campaign-opportunities",
      { method: "POST" }
    );

    const response = await findOpportunities(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.opportunities).toHaveLength(3);
    expect(body.data.opportunities[0]).toMatchObject({
      sku: "SKU-COF-COLD-001",
      recommendedDiscountPercent: 15,
      recommendedQuantityLimit: 50,
      confidence: "high"
    });
    await expect(prisma.campaign.count()).resolves.toBe(0);
  });

  test("generates, lists, and reads a campaign", async () => {
    const productId = await getColdBrewProductId();
    const generateRequest = await authenticatedRequest(
      "http://localhost/api/campaigns/generate",
      {
        method: "POST",
        body: JSON.stringify({
          productId,
          discountPercent: 15,
          quantityLimit: 80,
          imageVariants: 2,
          optionalInstructions: "Keep it warm and premium."
        })
      }
    );

    const generateResponse = await generateCampaign(generateRequest);
    const generateBody = await generateResponse.json();

    expect(generateResponse.status).toBe(201);
    expect(generateBody.data.campaign).toMatchObject({
      productId,
      discountPercent: 15,
      quantityLimit: 80,
      initialImageVariantsRequested: 2,
      optionalInstructions: "Keep it warm and premium."
    });
    expect(generateBody.data.images).toHaveLength(2);
    expect(generateBody.data.images[0]).toMatchObject({
      campaignId: generateBody.data.campaign.campaignId,
      imageUrl:
        `/api/campaigns/${generateBody.data.campaign.campaignId}` +
        `/images/${generateBody.data.images[0].imageId}`,
      variantIndex: 1,
      mimeType: "image/jpeg",
      status: "completed"
    });
    expect(generateBody.data.images[0]).not.toHaveProperty("imageData");

    const directCreateResponse = await createCampaign(
      await authenticatedRequest("http://localhost/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          productId,
          discountPercent: 25,
          quantityLimit: 60,
          imageVariants: 1,
          instagramCaption:
            "Cold Brew Concentrate is 25% off for the first 60 units.",
          imagePrompt:
            "Square Instagram product image for Cold Brew Concentrate with 25% off text.",
          reasoning:
            "High available stock and low sales make this a strong campaign candidate."
        })
      })
    );
    const directCreateBody = await directCreateResponse.json();

    expect(directCreateResponse.status).toBe(201);
    expect(directCreateBody.data.campaign).toMatchObject({
      productId,
      discountPercent: 25,
      quantityLimit: 60,
      initialImageVariantsRequested: 1,
      instagramCaption:
        "Cold Brew Concentrate is 25% off for the first 60 units.",
      codexReasoning:
        "High available stock and low sales make this a strong campaign candidate."
    });
    expect(directCreateBody.data.images).toHaveLength(1);
    expect(directCreateBody.data.images[0]).toMatchObject({
      campaignId: directCreateBody.data.campaign.campaignId,
      imageUrl:
        `/api/campaigns/${directCreateBody.data.campaign.campaignId}` +
        `/images/${directCreateBody.data.images[0].imageId}`,
      variantIndex: 1
    });

    const listResponse = await listCampaigns(
      await authenticatedRequest("http://localhost/api/campaigns")
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.data.campaigns).toHaveLength(2);
    expect(listBody.data.campaigns.map(
      (campaign: { campaignId: string }) => campaign.campaignId
    )).toContain(generateBody.data.campaign.campaignId);
    const directlyCreatedSummary = listBody.data.campaigns.find(
      (campaign: { campaignId: string }) =>
        campaign.campaignId === directCreateBody.data.campaign.campaignId
    );
    expect(directlyCreatedSummary).toMatchObject({
      productId,
      discountPercent: 25,
      quantityLimit: 60,
      initialImageVariantsRequested: 1,
      imageCount: 1
    });

    const filteredListResponse = await listCampaigns(
      await authenticatedRequest(`http://localhost/api/campaigns?productId=${productId}`)
    );
    const filteredListBody = await filteredListResponse.json();

    expect(filteredListResponse.status).toBe(200);
    expect(filteredListBody.data.campaigns).toHaveLength(2);

    const detailResponse = await getCampaign(
      await authenticatedRequest(
        `http://localhost/api/campaigns/${generateBody.data.campaign.campaignId}`
      ),
      {
        params: Promise.resolve({
          campaignId: generateBody.data.campaign.campaignId
        })
      }
    );
    const detailBody = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailBody.data.campaign.campaignId).toBe(
      generateBody.data.campaign.campaignId
    );
    expect(detailBody.data.campaign).toMatchObject({
      discountPercent: 15,
      quantityLimit: 80,
      initialImageVariantsRequested: 2
    });
    expect(detailBody.data.images).toHaveLength(2);
    expect(detailBody.data.images[0].imageUrl).toBe(
      `/api/campaigns/${generateBody.data.campaign.campaignId}` +
        `/images/${detailBody.data.images[0].imageId}`
    );
    expect(detailBody.data.images[0]).not.toHaveProperty("imageData");
  });

  test("maps invalid campaign generate payloads to validation errors", async () => {
    const request = await authenticatedRequest(
      "http://localhost/api/campaigns/generate",
      {
        method: "POST",
        body: JSON.stringify({ productId: "" })
      }
    );

    const response = await generateCampaign(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  test("treats blank optional campaign instructions as not provided", async () => {
    const productId = await getColdBrewProductId();
    const request = await authenticatedRequest(
      "http://localhost/api/campaigns/generate",
      {
        method: "POST",
        body: JSON.stringify({
          productId,
          discountPercent: 15,
          quantityLimit: 80,
          imageVariants: 1,
          optionalInstructions: ""
        })
      }
    );

    const response = await generateCampaign(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.campaign.optionalInstructions).toBeNull();
  });

  test("rejects campaign generate requests above available stock", async () => {
    const product = await getColdBrewProduct();
    const request = await authenticatedRequest(
      "http://localhost/api/campaigns/generate",
      {
        method: "POST",
        body: JSON.stringify({
          productId: product.productId,
          discountPercent: 15,
          quantityLimit: product.availableQuantity + 1,
          imageVariants: 1
        })
      }
    );

    const response = await generateCampaign(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  test("maps malformed campaign generate JSON to validation errors", async () => {
    const request = await authenticatedRequest(
      "http://localhost/api/campaigns/generate",
      {
        method: "POST",
        body: "{"
      }
    );

    const response = await generateCampaign(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });
});

async function authenticatedRequest(input: string, init: RequestInit = {}) {
  const user = await prisma.user.findUnique({
    where: { email: "demo@promo.test" }
  });

  if (!user) {
    throw new Error("Seeded user missing");
  }

  const session = await createSession(user.id);
  const { sessionCookieName } = getServerEnv();
  const headers = new Headers(init.headers);
  headers.set("cookie", `${sessionCookieName}=${session.rawToken}`);
  headers.set("content-type", "application/json");

  return new Request(input, {
    ...init,
    headers
  });
}

async function getColdBrewProductId() {
  return (await getColdBrewProduct()).productId;
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
