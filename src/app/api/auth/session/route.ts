import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);

    return successResponse({ user: session.user });
  } catch (error) {
    return errorResponse(error);
  }
}
