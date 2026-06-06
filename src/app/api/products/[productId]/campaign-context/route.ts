import { getProductCampaignContext } from "@/server/campaign-context/campaign-context-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireSession(request);
    const { productId } = await context.params;
    const campaignContext = await getProductCampaignContext(productId);

    return successResponse(campaignContext);
  } catch (error) {
    return errorResponse(error);
  }
}
