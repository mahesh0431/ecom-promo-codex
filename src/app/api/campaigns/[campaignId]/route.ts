import { getCampaignForUser } from "@/server/campaigns/campaign-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { campaignId } = await context.params;
    const result = await getCampaignForUser(session.user.id, campaignId);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
