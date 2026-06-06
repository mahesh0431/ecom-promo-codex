import { getRawCampaignImageForUser } from "@/server/images/campaign-image-service";
import { errorResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    campaignId: string;
    imageId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { campaignId, imageId } = await context.params;
    const image = await getRawCampaignImageForUser({
      userId: session.user.id,
      campaignId,
      imageId
    });

    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
