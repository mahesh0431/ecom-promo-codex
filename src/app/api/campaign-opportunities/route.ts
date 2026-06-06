import { findCampaignOpportunitiesForUser } from "@/server/campaigns/campaign-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const result = await findCampaignOpportunitiesForUser(session.user.id);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
