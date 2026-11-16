import { getAiStatus } from "@/lib/ai/client";
import { apiSuccess } from "@/lib/api/handler";
import { resolveBrowserApiKey } from "@/lib/security/browser-api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports the active mode, the configured model and which source provided the
 * key. The key itself is never returned.
 */
export async function GET(request: Request) {
  return apiSuccess(getAiStatus(resolveBrowserApiKey(request)));
}
