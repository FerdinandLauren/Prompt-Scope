import { verifyConnection } from "@/lib/ai/verify";
import { apiSuccess, failureFromError, guardRateLimit } from "@/lib/api/handler";
import { resolveBrowserApiKey } from "@/lib/security/browser-api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirms that the active key can reach the provider. It never returns the key
 * and it does not save anything on the server.
 */
export async function POST(request: Request) {
  const limited = guardRateLimit(request);
  if (limited) return limited;

  const browserApiKey = resolveBrowserApiKey(request);

  try {
    const result = await verifyConnection(browserApiKey);
    return apiSuccess(result);
  } catch (error) {
    return failureFromError(error);
  }
}
