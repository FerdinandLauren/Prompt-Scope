import { discoverStep } from "@/lib/ai/discover";
import { apiSuccess, failureFromError, guardRateLimit, readValidatedBody } from "@/lib/api/handler";
import { resolveAiContext } from "@/lib/ai/providers/config";
import { discoveryRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = guardRateLimit(request);
  if (limited) return limited;

  const body = await readValidatedBody(request, discoveryRequestSchema);
  if (!body.ok) return body.response;

  const aiContext = resolveAiContext(request);

  try {
    const result = await discoverStep(body.data, aiContext);
    return apiSuccess(result);
  } catch (error) {
    return failureFromError(error);
  }
}
