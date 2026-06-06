import { beforeEach, describe, expect, test } from "vitest";

import { POST as generateImages } from "@/app/api/campaigns/[campaignId]/images/generate/route";
import { GET as listImages } from "@/app/api/campaigns/[campaignId]/images/route";
import { GET as getImage } from "@/app/api/campaigns/[campaignId]/images/[imageId]/route";
import { createSession } from "@/server/auth/session-service";
import { prisma } from "@/server/db/client";
import { getServerEnv } from "@/server/env";
import { listProductsForCampaignReview } from "@/server/products/product-service";

describe("campaign image routes", () => {
  beforeEach(async () => {
    process.env.IMAGE_GENERATION_MODE = "fake";
    await prisma.campaignImage.deleteMany();
    await prisma.campaign.deleteMany();
  });

  test("rejects unauthenticated image generation", async () => {
    const response = await generateImages(
      new Request("http://localhost/api/campaigns/campaign-1/images/generate", {
        method: "POST"
      }),
      { params: Promise.resolve({ campaignId: "campaign-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" }
    });
  });

  test("generates, lists, and serves raw campaign image bytes", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id);

    const generateResponse = await generateImages(
      await authenticatedRequest(
        `http://localhost/api/campaigns/${campaign.id}/images/generate`,
        {
          method: "POST",
          body: JSON.stringify({ variants: 2 })
        }
      ),
      { params: Promise.resolve({ campaignId: campaign.id }) }
    );
    const generateBody = await generateResponse.json();

    expect(generateResponse.status).toBe(201);
    expect(generateBody.data.images).toHaveLength(2);
    expect(generateBody.data.images[0]).toMatchObject({
      campaignId: campaign.id,
      variantIndex: 1,
      mimeType: "image/jpeg",
      status: "completed"
    });
    expect(generateBody.data.images[0]).not.toHaveProperty("imageData");

    const listResponse = await listImages(
      await authenticatedRequest(
        `http://localhost/api/campaigns/${campaign.id}/images`
      ),
      { params: Promise.resolve({ campaignId: campaign.id }) }
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.data.images.map((image: { variantIndex: number }) => image.variantIndex)).toEqual([
      1,
      2
    ]);
    expect(listBody.data.images[0]).not.toHaveProperty("imageData");

    const rawResponse = await getImage(
      await authenticatedRequest(
        `http://localhost/api/campaigns/${campaign.id}/images/${generateBody.data.images[0].imageId}`
      ),
      {
        params: Promise.resolve({
          campaignId: campaign.id,
          imageId: generateBody.data.images[0].imageId
        })
      }
    );
    const rawBytes = Buffer.from(await rawResponse.arrayBuffer());

    expect(rawResponse.status).toBe(200);
    expect(rawResponse.headers.get("content-type")).toBe("image/jpeg");
    expect(rawResponse.headers.get("cache-control")).toBe("no-store");
    expect(rawBytes.length).toBeGreaterThan(0);
  });

  test("returns validation errors for invalid variants", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id);

    const response = await generateImages(
      await authenticatedRequest(
        `http://localhost/api/campaigns/${campaign.id}/images/generate`,
        {
          method: "POST",
          body: JSON.stringify({ variants: "two" })
        }
      ),
      { params: Promise.resolve({ campaignId: campaign.id }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  test("returns validation errors for malformed JSON bodies", async () => {
    const user = await getSeededUser();
    const campaign = await createCampaign(user.id);

    const response = await generateImages(
      await authenticatedRequest(
        `http://localhost/api/campaigns/${campaign.id}/images/generate`,
        {
          method: "POST",
          body: "{"
        }
      ),
      { params: Promise.resolve({ campaignId: campaign.id }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  test("does not serve an image through the wrong campaign", async () => {
    const user = await getSeededUser();
    const owned = await createCampaign(user.id);
    const other = await createCampaign(user.id);
    const image = await prisma.campaignImage.create({
      data: {
        campaignId: owned.id,
        prompt: "Saved image prompt",
        imageData: Buffer.from("not-a-real-jpeg"),
        mimeType: "image/jpeg",
        variantIndex: 1,
        model: "fake-gpt-image-2",
        size: "1024x1024",
        status: "completed"
      }
    });

    const response = await getImage(
      await authenticatedRequest(
        `http://localhost/api/campaigns/${other.id}/images/${image.id}`
      ),
      {
        params: Promise.resolve({
          campaignId: other.id,
          imageId: image.id
        })
      }
    );

    expect(response.status).toBe(404);
  });
});

async function authenticatedRequest(input: string, init: RequestInit = {}) {
  const user = await getSeededUser();
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

async function getSeededUser() {
  const user = await prisma.user.findUnique({
    where: { email: "demo@promo.test" }
  });

  if (!user) {
    throw new Error("Seeded user missing");
  }

  return user;
}

async function createCampaign(userId: string) {
  const products = await listProductsForCampaignReview();
  const product = products[0];

  if (!product) {
    throw new Error("Seeded product missing");
  }

  return prisma.campaign.create({
    data: {
      userId,
      productId: product.productId,
      prompt: "Campaign prompt",
      instagramCaption: "Caption",
      imagePrompt: "Saved image prompt",
      codexReasoning: "Reasoning"
    }
  });
}
