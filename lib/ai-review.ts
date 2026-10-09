/**
 * Text handling for the AI sentence review.
 *
 * Kept separate from the component so it can be tested without a browser: this
 * is the code that actually rewrites the author's paragraph, so a mistake here
 * corrupts text rather than merely looking wrong.
 */

export type ChangeKind = "grammar" | "agreement" | "particle" | "word-order" | "typo";

export interface AiChange {
  before: string;
  after: string;
  kind: ChangeKind;
  why: string;
}

export interface AiUsage {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface AiReviewResult {
  corrected: string;
  ok: boolean;
  changes: AiChange[];
  model?: string;
  /** Exact token counts from the provider, so cost is measured rather than guessed. */
  usage?: AiUsage | null;
}

export interface ApplyOutcome {
  text: string;
  /** How many of the requested changes were located and applied. */
  applied: number;
}

/**
 * Replace each change's original text with its replacement.
 *
 * Edits are applied from the end of the paragraph backwards so an earlier one
 * cannot shift the offsets of a later one. A change whose `before` cannot be
 * found, or which overlaps one already placed, is skipped rather than guessed
 * at — the model's substrings are not guaranteed to be present.
 */
export function applyChanges(text: string, changes: AiChange[]): ApplyOutcome {
  const located: Array<{ start: number; end: number; change: AiChange }> = [];
  const taken: Array<{ start: number; end: number }> = [];

  for (const change of changes) {
    if (!change.before) continue;
    const start = text.indexOf(change.before);
    if (start === -1) continue;
    const end = start + change.before.length;
    if (taken.some((t) => start < t.end && t.start < end)) continue;
    taken.push({ start, end });
    located.push({ start, end, change });
  }

  located.sort((a, b) => b.start - a.start);
  let result = text;
  for (const item of located) {
    result = result.slice(0, item.start) + item.change.after + result.slice(item.end);
  }
  return { text: result, applied: located.length };
}
