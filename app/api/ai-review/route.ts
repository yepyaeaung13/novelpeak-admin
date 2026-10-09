import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { describeProviderError } from "@/lib/provider-error";
import { summariseUsage, type Prices, type TokenUsage } from "@/lib/usage";

/**
 * Server-side proxy for the AI sentence-structure review.
 *
 * The key lives here and never reaches the browser. Putting it in a
 * NEXT_PUBLIC_* variable would ship it to every visitor of the admin panel.
 *
 * The wire format is the OpenAI-compatible chat-completions API, which is the de
 * facto standard: OpenAI, DeepSeek, Groq, Together, Hugging Face's router and
 * others all accept it. Switching provider is therefore AI_REVIEW_BASE_URL and
 * AI_REVIEW_MODEL in .env, with no code change.
 *
 * This replaced an earlier Gemini implementation because Google blocks Gemini in
 * Myanmar. Anthropic is not an option either: Myanmar is absent from their
 * supported-regions list, while OpenAI lists it explicitly.
 */

export const runtime = "nodejs";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_PARAGRAPH_CHARS = 6000;

/**
 * JSON Schema (strict mode) for the answer.
 *
 * Structured output is used so the model returns a predictable shape: a corrected
 * paragraph plus a list of individual changes. A free-form answer could not be
 * applied to the author's text one edit at a time.
 *
 * Strict mode requires every property to be listed in `required` and
 * `additionalProperties: false` at each level.
 */
const RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "burmese_proofread",
    strict: true,
    schema: {
      type: "object",
      properties: {
        corrected: {
          type: "string",
          description:
            "The paragraph with grammar and agreement problems fixed. Words that were already correct stay exactly as they were.",
        },
        ok: {
          type: "boolean",
          description: "True when the paragraph already reads as correct Burmese.",
        },
        changes: {
          type: "array",
          description:
            "One entry per correction made. Empty array when the paragraph needs no correction.",
          items: {
            type: "object",
            properties: {
              before: {
                type: "string",
                description:
                  "The exact original substring that was wrong, copied verbatim from the paragraph.",
              },
              after: {
                type: "string",
                description: "What it was replaced with. Empty string if deleted.",
              },
              kind: {
                type: "string",
                enum: ["grammar", "agreement", "particle", "word-order", "typo"],
                description: "The category of the problem.",
              },
              why: {
                type: "string",
                description: "Short reason, in English, naming the grammatical problem.",
              },
            },
            required: ["before", "after", "kind", "why"],
            additionalProperties: false,
          },
        },
      },
      required: ["corrected", "ok", "changes"],
      additionalProperties: false,
    },
  },
} as const;

const SYSTEM_PROMPT = `You proofread Burmese (Myanmar) prose written for a novel.

Your only job is GRAMMAR AND AGREEMENT. Correct:
- broken or ungrammatical sentence structure
- wrong or missing sentence-final particles and verb markers
- subject/verb or noun/classifier disagreement
- missing or duplicated subjects and objects
- wrong case markers or postpositions
- clear typographical errors

You must NOT:
- reword sentences that are already grammatical
- change the author's word choice, style, tone or rhythm
- "improve" or embellish the prose
- touch Pali loanwords or Buddhist terminology
- translate anything
- add or remove sentences
- change the meaning

Hard rules:
1. Output the whole paragraph in "corrected". If nothing is wrong, return the
   paragraph completely unchanged and set ok to true.
2. List every correction in "changes", each with the exact original substring in
   "before" and its replacement in "after". These strings must appear verbatim in
   the paragraph so the edit can be located.
3. Change as little as possible. A paragraph with no grammatical fault must come
   back byte-for-byte identical.
4. Write all Burmese output in Unicode. Never emit Zawgyi code points.
5. If you are unsure whether something is an error, leave it alone.

The user's message is the paragraph to check.`;

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string;
  }>;
  usage?: TokenUsage;
  error?: { message?: string; code?: string; type?: string };
}

/**
 * Per-million-token prices, used only to show the author what a review cost.
 * Defaults match gpt-6-luna as configured in .env; override when changing model.
 */
const PRICES: Prices = {
  input: Number(process.env.AI_REVIEW_PRICE_INPUT ?? "0.10") / 1e6,
  cachedInput: Number(process.env.AI_REVIEW_PRICE_CACHED_INPUT ?? "0.01") / 1e6,
  output: Number(process.env.AI_REVIEW_PRICE_OUTPUT ?? "0.50") / 1e6,
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.AI_REVIEW_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No AI key is configured. Add AI_REVIEW_API_KEY to .env and restart the server.",
        code: "no-key",
      },
      { status: 503 },
    );
  }

  const baseUrl = (process.env.AI_REVIEW_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.AI_REVIEW_MODEL || DEFAULT_MODEL;

  let paragraph = "";
  let style = "";
  try {
    const body = (await request.json()) as { paragraph?: unknown; style?: unknown };
    paragraph = typeof body.paragraph === "string" ? body.paragraph : "";
    style = typeof body.style === "string" ? body.style.slice(0, 200) : "";
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!paragraph.trim()) {
    return NextResponse.json({ error: "The paragraph is empty." }, { status: 400 });
  }
  if (paragraph.length > MAX_PARAGRAPH_CHARS) {
    return NextResponse.json(
      { error: `That paragraph is too long (${paragraph.length} characters).` },
      { status: 413 },
    );
  }

  const system = style ? `${SYSTEM_PROMPT}\n\nRegister/context: ${style}` : SYSTEM_PROMPT;

  // Strict JSON-schema output is the default, but not every OpenAI-compatible
  // provider implements it (Groq, for one, supports only json_object). With
  // AI_REVIEW_STRICT_JSON=false the schema is described in the prompt and plain
  // JSON mode is requested instead. The answer is parsed and validated either
  // way, so a provider that ignores the request cannot slip bad data through.
  const useStrictSchema = process.env.AI_REVIEW_STRICT_JSON !== "false";
  const promptWithSchema = useStrictSchema
    ? system
    : `${system}\n\nReply with a single JSON object matching this schema:\n${JSON.stringify(
        RESPONSE_SCHEMA.json_schema.schema,
      )}`;
  const responseFormat = useStrictSchema
    ? RESPONSE_SCHEMA
    : { type: "json_object" as const };

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: promptWithSchema },
          { role: "user", content: paragraph },
        ],
        response_format: responseFormat,
      }),
      // The route must not hang forever on a stalled upstream call.
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "The AI service took too long to answer. Try again."
          : "Could not reach the AI service. Check the server's network connection.",
      },
      { status: 504 },
    );
  }

  const rawBody = await upstream.text();

  if (!upstream.ok) {
    let detail = rawBody.slice(0, 300);
    let code = "";
    let type = "";
    try {
      const parsed = JSON.parse(rawBody) as ChatCompletionResponse;
      detail = parsed.error?.message ?? detail;
      code = parsed.error?.code ?? "";
      type = parsed.error?.type ?? "";
    } catch {
      // Body was not JSON; the status code alone will have to do.
    }
    return NextResponse.json(
      { error: describeProviderError(upstream.status, detail, code, type) },
      { status: 502 },
    );
  }

  let payload: ChatCompletionResponse;
  try {
    payload = JSON.parse(rawBody) as ChatCompletionResponse;
  } catch {
    return NextResponse.json(
      { error: "The AI service returned a response that could not be read." },
      { status: 502 },
    );
  }

  const choice = payload.choices?.[0];
  const content = choice?.message?.content ?? "";

  if (!content.trim()) {
    return NextResponse.json(
      {
        error:
          choice?.finish_reason && choice.finish_reason !== "stop"
            ? `The AI service stopped early (${choice.finish_reason}).`
            : "The AI service returned an empty answer.",
      },
      { status: 502 },
    );
  }

  // Structured output should guarantee JSON, but a truncated answer would not
  // parse and must not be handed to the editor as if it were a correction.
  let parsed: { corrected?: unknown; ok?: unknown; changes?: unknown };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    return NextResponse.json(
      { error: "The AI answer was not valid JSON, so it was discarded." },
      { status: 502 },
    );
  }

  if (typeof parsed.corrected !== "string") {
    return NextResponse.json(
      { error: "The AI answer was missing the corrected paragraph." },
      { status: 502 },
    );
  }

  const changes = Array.isArray(parsed.changes)
    ? parsed.changes
        .filter(
          (item): item is { before: string; after: string; kind: string; why: string } =>
            !!item &&
            typeof item === "object" &&
            typeof (item as { before?: unknown }).before === "string" &&
            typeof (item as { after?: unknown }).after === "string",
        )
        .map((item) => ({
          before: item.before,
          after: item.after,
          kind: typeof item.kind === "string" ? item.kind : "grammar",
          why: typeof item.why === "string" ? item.why : "",
        }))
    : [];

  return NextResponse.json({
    corrected: parsed.corrected,
    ok: parsed.ok === true || parsed.corrected === paragraph,
    changes,
    model,
    usage: summariseUsage(payload.usage, PRICES),
  });
}
