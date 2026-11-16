import { generatePrompt } from "@/lib/ai/generate";
import { apiSuccess, failureFromError, guardRateLimit, readValidatedBody } from "@/lib/api/handler";
import { resolveBrowserApiKey } from "@/lib/security/browser-api-key";
import { generateRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = guardRateLimit(request);
  if (limited) return limited;

  const body = await readValidatedBody(request, generateRequestSchema);
  if (!body.ok) return body.response;

  const browserApiKey = resolveBrowserApiKey(request);

  try {
    const result = await generatePrompt(body.data.configuration, browserApiKey);
    return apiSuccess(result);
  } catch (error) {
    return failureFromError(error);
  }
}
