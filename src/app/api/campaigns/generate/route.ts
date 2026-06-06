import { generateCampaignRequestSchema } from "@/server/campaigns/campaign-schemas";
import { generateCampaignForUser } from "@/server/campaigns/campaign-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";
import { readJsonRequest } from "@/server/http/request-json";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const payload = generateCampaignRequestSchema.parse(
      await readJsonRequest(request)
    );
    const result = await generateCampaignForUser({
      userId: session.user.id,
      productId: payload.productId,
      discountPercent: payload.discountPercent,
      quantityLimit: payload.quantityLimit,
      imageVariants: payload.imageVariants,
      optionalInstructions: payload.optionalInstructions
    });

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
