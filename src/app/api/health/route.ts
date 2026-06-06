import { successResponse } from "@/server/http/api-response";
import { getBackendRuntimeReadiness } from "@/server/runtime/backend-runtime-readiness";

export const runtime = "nodejs";

export function GET() {
  return successResponse({
    status: "ok",
    service: "ecom-promo-codex",
    runtime: getBackendRuntimeReadiness()
  });
}
