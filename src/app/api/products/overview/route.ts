import { getProductOverview } from "@/server/products/product-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireSession(request);
    const overview = await getProductOverview();

    return successResponse(overview);
  } catch (error) {
    return errorResponse(error);
  }
}
