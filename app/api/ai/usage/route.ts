import { usageSummary } from "@/lib/ai/providers/usage";
import { apiSuccess } from "@/lib/api/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Usage recorded by this server process. Providers that do not report token
 * counts are marked `unavailable` instead of being estimated.
 */
export async function GET() {
  return apiSuccess(usageSummary());
}
