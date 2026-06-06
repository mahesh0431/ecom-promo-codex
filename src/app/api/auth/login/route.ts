import { z } from "zod";

import { loginWithPassword } from "@/server/auth/auth-service";
import { errorResponse, successResponse } from "@/server/http/api-response";
import { setSessionCookie } from "@/server/http/cookies";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const result = await loginWithPassword(payload.email, payload.password);
    const response = successResponse({
      user: result.user
    });

    setSessionCookie(response, result.sessionToken, result.expiresAt);

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
