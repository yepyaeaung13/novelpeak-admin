/**
 * Entry point for AI sentence review.
 *
 * This talks to the admin app's own route handler, not to the external chapter
 * API, so it uses fetch with a relative URL: the shared axios client is
 * configured with NEXT_PUBLIC_API_BASE_URL and would send this request to the
 * wrong origin.
 *
 * The API key itself lives only in the route handler.
 */

import type { AiReviewResult, AiUsage } from "@/lib/ai-review";

export type { AiChange, AiReviewResult, AiUsage, ChangeKind } from "@/lib/ai-review";

export class AiReviewError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AiReviewError";
    this.status = status;
    this.code = code;
  }
}

export async function reviewParagraphWithAi(
  paragraph: string,
  style?: string,
): Promise<AiReviewResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paragraph, style }),
    });
  } catch {
    throw new AiReviewError("Could not reach the AI review service.", 0);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Fall through to the status-based message below.
  }

  const body = (payload ?? {}) as {
    error?: unknown;
    code?: unknown;
    corrected?: unknown;
    ok?: unknown;
    changes?: unknown;
    model?: unknown;
    usage?: unknown;
  };

  if (!response.ok) {
    throw new AiReviewError(
      typeof body.error === "string" ? body.error : `The AI review failed (${response.status}).`,
      response.status,
      typeof body.code === "string" ? body.code : undefined,
    );
  }

  if (typeof body.corrected !== "string") {
    throw new AiReviewError("The AI review returned nothing usable.", response.status);
  }

  const usage = body.usage as AiUsage | null | undefined;

  return {
    corrected: body.corrected,
    ok: body.ok === true,
    changes: Array.isArray(body.changes) ? (body.changes as AiReviewResult["changes"]) : [],
    model: typeof body.model === "string" ? body.model : undefined,
    usage: usage && typeof usage.totalTokens === "number" ? usage : null,
  };
}
