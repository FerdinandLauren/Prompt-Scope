import { improvePrompt } from "@/lib/ai/improve";
import { apiSuccess, failureFromError, guardRateLimit, readValidatedBody } from "@/lib/api/handler";
import { resolveAiContext } from "@/lib/ai/providers/config";
import { improveRequestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = guardRateLimit(request);
  if (limited) return limited;

  const body = await readValidatedBody(request, improveRequestSchema);
  if (!body.ok) return body.response;

  const { originalPrompt, category, rubricVersion, priorities, additionalInstructions, analysis } =
    body.data;
  const aiContext = resolveAiContext(request);

  try {
    const improvement = await improvePrompt(
      {
        originalPrompt,
        category,
        rubricVersion,
        priorities,
        additionalInstructions,
        analysis: analysis
          ? {
              summary: analysis.summary,
              weaknesses: analysis.weaknesses.map((weakness) => ({
                dimension: weakness.dimension,
                severity: weakness.severity,
                problem: weakness.problem,
                suggestion: weakness.suggestion,
              })),
            }
          : undefined,
      },
      aiContext,
    );

    return apiSuccess(improvement);
  } catch (error) {
    return failureFromError(error);
  }
}
