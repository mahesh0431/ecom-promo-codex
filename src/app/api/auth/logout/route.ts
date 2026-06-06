import { destroySession } from "@/server/auth/session-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import {
  clearSessionCookie,
  getSessionCookieFromRequest
} from "@/server/http/cookies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawToken = getSessionCookieFromRequest(request);

    if (rawToken) {
      await destroySession(rawToken);
    }

    const response = successResponse({ ok: true });
    clearSessionCookie(response);

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
