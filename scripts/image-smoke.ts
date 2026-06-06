import { generateImagesForCampaign } from "@/server/images/campaign-image-service";
import { prisma } from "@/server/db/client";
import { listProductsForCampaignReview } from "@/server/products/product-service";

const SMOKE_PROMPT = "Image smoke campaign for backend validation.";

async function main() {
  loadLocalEnv();

  if (process.env.RUN_IMAGE_LIVE !== "1") {
    console.log("Skipping live image smoke. Set RUN_IMAGE_LIVE=1 to run it.");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required for live image smoke. Tests should use IMAGE_GENERATION_MODE=fake."
    );
  }

  process.env.IMAGE_GENERATION_MODE = "openai";

  const user = await prisma.user.findUnique({
    where: { email: "demo@promo.test" }
  });

  if (!user) {
    throw new Error("Seeded demo user missing. Run pnpm db:seed first.");
  }

  const campaign = await findOrCreateSmokeCampaign(user.id);
  const result = await generateImagesForCampaign({
    userId: user.id,
    campaignId: campaign.id,
    variants: 1
  });
  const image = result.images[0];

  if (!image) {
    throw new Error("Live image smoke did not create image metadata.");
  }

  const stored = await prisma.campaignImage.findUnique({
    where: { id: image.imageId }
  });

  if (!stored) {
    throw new Error("Live image smoke did not persist a CampaignImage row.");
  }

  if (Buffer.from(stored.imageData).length === 0) {
    throw new Error("Live image smoke persisted empty image bytes.");
  }

  if (stored.mimeType !== "image/jpeg") {
    throw new Error(`Expected image/jpeg, received ${stored.mimeType}.`);
  }

  console.log("Live image smoke passed.");
  console.log(
    JSON.stringify(
      {
        campaignId: campaign.id,
        imageId: image.imageId,
        variantIndex: image.variantIndex,
        mimeType: stored.mimeType,
        byteLength: Buffer.from(stored.imageData).length
      },
      null,
      2
    )
  );
}

async function findOrCreateSmokeCampaign(userId: string) {
  const existing = await prisma.campaign.findFirst({
    where: {
      userId,
      prompt: SMOKE_PROMPT
    },
    orderBy: { createdAt: "asc" }
  });

  if (existing) {
    return existing;
  }

  const products = await listProductsForCampaignReview();
  const product = products[0];

  if (!product) {
    throw new Error("Seeded products missing. Run pnpm db:seed first.");
  }

  return prisma.campaign.create({
    data: {
      userId,
      productId: product.productId,
      prompt: SMOKE_PROMPT,
      instagramCaption: "Live image smoke caption.",
      imagePrompt:
        "A clean studio product photo of a premium cold brew bottle on a simple counter, natural light, square composition.",
      codexReasoning: "Created by image smoke without invoking Codex generation."
    }
  });
}

function loadLocalEnv() {
  try {
    process.loadEnvFile?.(".env");
  } catch {
    return;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
