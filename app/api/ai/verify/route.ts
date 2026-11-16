import { z } from "zod";
import { verifyConnection } from "@/lib/ai/verify";
import { apiSuccess, failureFromError, guardRateLimit, readValidatedBody } from "@/lib/api/handler";
import { resolveAiContext } from "@/lib/ai/providers/config";
import { PROVIDER_IDS } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifyRequestSchema = z.object({
  provider: z.enum(PROVIDER_IDS).optional(),
});

/**
 * Confirms that the active key for one provider can reach it. It never returns
 * the key and it does not save anything on the server.
 */
export async function POST(request: Request) {
  const limited = guardRateLimit(request);
  if (limited) return limited;

  const body = await readValidatedBody(request, verifyRequestSchema);
  if (!body.ok) return body.response;

  try {
    const result = await verifyConnection(resolveAiContext(request), body.data.provider);
    return apiSuccess(result);
  } catch (error) {
    return failureFromError(error);
  }
}
