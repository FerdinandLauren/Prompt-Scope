import { getAiStatus } from "@/lib/ai/client";
import { apiSuccess } from "@/lib/api/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports only whether live mode is available and which model is configured.
 * The API key itself is never included.
 */
export async function GET() {
  return apiSuccess(getAiStatus());
}
