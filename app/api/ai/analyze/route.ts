import { analyzePrompt } from "@/lib/ai/analyze";
import { apiSuccess, failureFromError, guardRateLimit, readValidatedBody } from "@/lib/api/handler";
import { resolveAiContext } from "@/lib/ai/providers/config";
import { analyzeRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = guardRateLimit(request);
  if (limited) return limited;

  const body = await readValidatedBody(request, analyzeRequestSchema);
  if (!body.ok) return body.response;

  const aiContext = resolveAiContext(request);

  try {
    const snapshot = await analyzePrompt(body.data, aiContext);
    return apiSuccess(snapshot);
  } catch (error) {
    return failureFromError(error);
  }
}
