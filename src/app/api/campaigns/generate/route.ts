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
    const campaign = await generateCampaignForUser({
      userId: session.user.id,
      productId: payload.productId,
      optionalInstructions: payload.optionalInstructions
    });

    return successResponse({ campaign }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
