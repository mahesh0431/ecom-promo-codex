import { createCampaignRequestSchema } from "@/server/campaigns/campaign-schemas";
import {
  createCampaignForUser,
  listCampaignsForUser
} from "@/server/campaigns/campaign-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";
import { readJsonRequest } from "@/server/http/request-json";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const productId = new URL(request.url).searchParams.get("productId");
    const campaigns = await listCampaignsForUser(session.user.id, {
      productId: productId ?? undefined
    });

    return successResponse({ campaigns });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const payload = createCampaignRequestSchema.parse(
      await readJsonRequest(request)
    );
    const result = await createCampaignForUser({
      userId: session.user.id,
      productId: payload.productId,
      discountPercent: payload.discountPercent,
      quantityLimit: payload.quantityLimit,
      imageVariants: payload.imageVariants,
      instagramCaption: payload.instagramCaption,
      imagePrompt: payload.imagePrompt,
      reasoning: payload.reasoning,
      optionalInstructions: payload.optionalInstructions
    });

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
