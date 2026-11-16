import { z } from "zod";
import { listProviderModels } from "@/lib/ai/models";
import { resolveAiContext } from "@/lib/ai/providers/config";
import { apiSuccess, failureFromError, guardRateLimit, readValidatedBody } from "@/lib/api/handler";
import { PROVIDER_IDS } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  provider: z.enum(PROVIDER_IDS),
});

/**
 * Refreshes the model list for one provider with its configured key. The
 * response contains model ids and context windows only, never the key.
 */
export async function POST(request: Request) {
  const limited = guardRateLimit(request);
  if (limited) return limited;

  const body = await readValidatedBody(request, requestSchema);
  if (!body.ok) return body.response;

  try {
    const result = await listProviderModels(body.data.provider, resolveAiContext(request));
    return apiSuccess(result);
  } catch (error) {
    return failureFromError(error);
  }
}
