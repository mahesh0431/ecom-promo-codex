import { listCampaignsForUser } from "@/server/campaigns/campaign-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

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
