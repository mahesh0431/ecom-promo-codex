import { successResponse } from "@/server/http/api-response";

export const runtime = "nodejs";

export function GET() {
  return successResponse({
    status: "ok",
    service: "ecom-promo-codex"
  });
}
