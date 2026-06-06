import { beforeEach, describe, expect, test } from "vitest";

import { POST as findOpportunities } from "@/app/api/campaign-opportunities/route";
import { GET as listCampaigns } from "@/app/api/campaigns/route";
import { POST as generateCampaign } from "@/app/api/campaigns/generate/route";
import { GET as getCampaign } from "@/app/api/campaigns/[campaignId]/route";
import { createSession } from "@/server/auth/session-service";
import { prisma } from "@/server/db/client";
import { getServerEnv } from "@/server/env";
import { listProductsForCampaignReview } from "@/server/products/product-service";

describe("campaign routes", () => {
  beforeEach(async () => {
    process.env.CODEX_GATEWAY = "fake";
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
          optionalInstructions: "Keep it warm and premium."
        })
      }
    );

    const generateResponse = await generateCampaign(generateRequest);
    const generateBody = await generateResponse.json();

    expect(generateResponse.status).toBe(201);
    expect(generateBody.data.campaign).toMatchObject({
      productId,
      optionalInstructions: "Keep it warm and premium."
    });

    const listResponse = await listCampaigns(
      await authenticatedRequest("http://localhost/api/campaigns")
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.data.campaigns).toHaveLength(1);
    expect(listBody.data.campaigns[0].campaignId).toBe(
      generateBody.data.campaign.campaignId
    );

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
  const products = await listProductsForCampaignReview();
  const coldBrew = products.find(
    (product) => product.sku === "SKU-COF-COLD-001"
  );

  if (!coldBrew) {
    throw new Error("Cold Brew product missing");
  }

  return coldBrew.productId;
}
