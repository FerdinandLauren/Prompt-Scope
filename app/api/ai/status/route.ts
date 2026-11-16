import { getAiStatus } from "@/lib/ai/client";
import { apiSuccess } from "@/lib/api/handler";
import { resolveAiContext } from "@/lib/ai/providers/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports the active mode, the provider/model that would serve the next
 * request, per-provider health and the routing strategy. Keys are never
 * returned.
 */
export async function GET(request: Request) {
  return apiSuccess(getAiStatus(resolveAiContext(request)));
}
