import { createRealtimeSessionSecret } from "@/server/realtime/realtime-session-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { requireSession } from "@/server/http/cookies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const secret = await createRealtimeSessionSecret(session.user.id);
    const response = successResponse(secret);

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    const response = errorResponse(error);

    response.headers.set("Cache-Control", "no-store");

    return response;
  }
}
