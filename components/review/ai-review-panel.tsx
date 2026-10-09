"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, Undo2, Wand2 } from "lucide-react";
import { AiReviewError, reviewParagraphWithAi } from "@/service/ai-review";
import { applyChanges, type AiChange, type AiUsage } from "@/lib/ai-review";
import { cn } from "@/lib/utils";

/**
 * Sentence-structure review for a single paragraph.
 *
 * The model's answer is never applied on its own. Every change is listed and
 * applied only when the author accepts it, because no current model is reliable
 * enough at Burmese to be trusted with a whole paragraph unsupervised.
 */

export interface AppliedCorrection {
  /** The paragraph text after the accepted changes. */
  text: string;
  /** How many individual changes were folded in. */
  count: number;
}

interface AiReviewPanelProps {
  /** Text currently in the editor, including any manual or rule-based fixes. */
  text: string;
  /** Where the result should be written. */
  onApply: (correction: AppliedCorrection) => void;
  disabled?: boolean;
}

const KIND_LABEL: Record<string, string> = {
  grammar: "Grammar",
  agreement: "Agreement",
  particle: "Particle",
  "word-order": "Word order",
  typo: "Typo",
};

const KIND_STYLE: Record<string, string> = {
  grammar: "bg-violet-100 text-violet-800 border-violet-200",
  agreement: "bg-sky-100 text-sky-800 border-sky-200",
  particle: "bg-teal-100 text-teal-800 border-teal-200",
  "word-order": "bg-amber-100 text-amber-800 border-amber-200",
  typo: "bg-rose-100 text-rose-800 border-rose-200",
};

export function AiReviewPanel({ text, onApply, disabled = false }: AiReviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    corrected: string;
    ok: boolean;
    changes: AiChange[];
    model?: string;
    usage?: AiUsage | null;
  } | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [appliedNote, setAppliedNote] = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    setAppliedNote("");
    setResult(null);
    setAccepted(new Set());
    try {
      const answer = await reviewParagraphWithAi(text);
      setResult(answer);
      // Nothing to decide when the model found no fault.
      if (answer.changes.length === 0) setAccepted(new Set());
    } catch (caught) {
      setError(
        caught instanceof AiReviewError
          ? caught.message
          : "The AI review failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [text]);

  const toggle = (index: number) => {
    setAccepted((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setAppliedNote("");
  };

  const applySelected = () => {
    if (!result) return;
    const chosen = result.changes.filter((_, index) => accepted.has(index));
    if (chosen.length === 0) return;
    const outcome = applyChanges(text, chosen);
    onApply({ text: outcome.text, count: outcome.applied });
    setAppliedNote(
      outcome.applied === chosen.length
        ? `Applied ${outcome.applied} change${outcome.applied === 1 ? "" : "s"}.`
        : `Applied ${outcome.applied} of ${chosen.length}: the rest no longer matched the paragraph.`,
    );
    setResult(null);
    setAccepted(new Set());
  };

  const applyWhole = () => {
    if (!result) return;
    onApply({ text: result.corrected, count: result.changes.length });
    setAppliedNote("Applied the whole corrected paragraph.");
    setResult(null);
    setAccepted(new Set());
  };

  const untouched = result ? result.corrected === text : false;
  const selectedCount = accepted.size;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Wand2 className="h-4 w-4 text-violet-500" />
          Sentence review
        </p>
        <button
          onClick={run}
          disabled={disabled || loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1.5 text-xs text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Checking..." : "Ask AI"}
        </button>
      </div>

      <p className="mt-1.5 text-xs text-neutral-500">
        Checks grammar and agreement only. It will not reword prose that is already
        correct, and nothing is applied until you accept it.
      </p>

      {loading && (
        <p className="mt-3 text-xs text-neutral-500">
          Reading the paragraph. This takes a few seconds.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-3">
          {result.usage && (
            <p className="text-[11px] text-neutral-400">
              {result.usage.promptTokens.toLocaleString()} in
              {result.usage.cachedTokens > 0
                ? ` (${result.usage.cachedTokens.toLocaleString()} cached)`
                : ""}
              , {result.usage.completionTokens.toLocaleString()} out · about $
              {result.usage.costUsd.toFixed(5)} for this paragraph
            </p>
          )}

          {result.changes.length === 0 ? (
            <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-900">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                No grammatical fault found.
                {result.model ? <span className="text-green-700"> ({result.model})</span> : null}
              </span>
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-neutral-500">
                  {result.changes.length} change{result.changes.length === 1 ? "" : "s"} suggested
                  {result.model ? ` · ${result.model}` : ""}
                </p>
                <button
                  onClick={() => setAccepted(new Set(result.changes.map((_, i) => i)))}
                  className="text-xs text-neutral-600 underline hover:text-neutral-900"
                >
                  Select all
                </button>
              </div>

              <ul className="space-y-2">
                {result.changes.map((change, index) => {
                  const isAccepted = accepted.has(index);
                  return (
                    <li
                      key={`${change.before}-${index}`}
                      className={cn(
                        "rounded-lg border p-2.5 transition",
                        isAccepted ? "border-green-300 bg-green-50/60" : "border-neutral-200",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggle(index)}
                          aria-pressed={isAccepted}
                          aria-label={isAccepted ? "Deselect this change" : "Accept this change"}
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                            isAccepted
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-neutral-300 bg-white hover:border-neutral-400",
                          )}
                        >
                          {isAccepted && <Check className="h-3 w-3" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              KIND_STYLE[change.kind] ?? KIND_STYLE.grammar,
                            )}
                          >
                            {KIND_LABEL[change.kind] ?? change.kind}
                          </span>

                          <p className="mt-1.5 break-words text-sm">
                            <span className="rounded bg-red-50 px-1 text-red-900 line-through decoration-red-400">
                              {change.before}
                            </span>
                            <span className="mx-1 text-neutral-400">→</span>
                            <span className="rounded bg-green-50 px-1 text-green-900">
                              {change.after || "(removed)"}
                            </span>
                          </p>

                          {change.why && (
                            <p className="mt-1 text-xs text-neutral-600">{change.why}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={applySelected}
                  disabled={selectedCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply selected ({selectedCount})
                </button>
                {!untouched && (
                  <button
                    onClick={applyWhole}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                  >
                    Use the whole correction
                  </button>
                )}
                <button
                  onClick={() => {
                    setResult(null);
                    setAccepted(new Set());
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-900"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Discard
                </button>
              </div>

              <p className="text-[11px] text-neutral-400">
                The suggested text can still be wrong. Check each change before accepting it.
              </p>
            </>
          )}

          {appliedNote && (
            <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
              {appliedNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
