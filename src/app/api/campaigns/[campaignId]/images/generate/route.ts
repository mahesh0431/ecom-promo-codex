import { z } from "zod";

import { AppError } from "@/server/errors";
import { generateImagesForCampaign } from "@/server/images/campaign-image-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

const generateImagesRequestSchema = z
  .object({
    variants: z.number().int().optional()
  })
  .optional()
  .default({});

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { campaignId } = await context.params;
    const payload = generateImagesRequestSchema.parse(await readJson(request));
    const result = await generateImagesForCampaign({
      userId: session.user.id,
      campaignId,
      variants: payload.variants
    });

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

async function readJson(request: Request) {
  const text = await request.text();

  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }
}
