"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  SEVERITY_BADGE,
  SEVERITY_DOT,
  SEVERITY_LABEL,
  HighlightedText,
} from "@/components/review/highlighted-text";
import { useChapterReview } from "@/hooks/useChapterReview";
import { AiReviewPanel } from "@/components/review/ai-review-panel";
import { useGetChapterDetails, useUpdateChapter } from "@/query/book";
import {
  analyseChapter,
  analyseParagraph,
  applyFix,
  replaceEditedParagraphs,
  reviewQueue,
  type Issue,
  type ParagraphAnalysis,
  type Severity,
} from "@/lib/myanmar-review";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low", "info"];

export default function Page() {
  const router = useRouter();
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const bookId = id as string;
  const currentChapterId = chapterId as string;

  const { data, isLoading } = useGetChapterDetails(currentChapterId, bookId);
  const content = (data?.content as string) ?? "";

  const analysis = useMemo(() => analyseChapter(content), [content]);
  const review = useChapterReview(currentChapterId, content);

  const [cursor, setCursor] = useState(0);
  const [showClean, setShowClean] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeRule, setActiveRule] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [fixNotice, setFixNotice] = useState("");
  const [saved, setSaved] = useState(false);
  // Spans already rewritten in this paragraph, so a second fix cannot be
  // applied on top of the same characters.
  const appliedRef = useRef(new Map<number, Array<{ start: number; end: number }>>());
  const shownIndex = useRef<number | null>(null);
  // Derived rather than synced through an effect: null means "use the loaded
  // title", a string means the author edited it.
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const title = titleOverride ?? String(data?.title ?? "");

  const queue: ParagraphAnalysis[] = useMemo(
    () => reviewQueue(analysis, showClean),
    [analysis, showClean],
  );

  const safeCursor = queue.length === 0 ? 0 : Math.min(cursor, queue.length - 1);
  const current = queue[safeCursor];

  // Reset the transient per-paragraph UI when the selection changes. Adjusting
  // state during render is the documented alternative to an effect here, and it
  // also clears the record of which spans were rewritten so the overlap guard
  // starts fresh for the next paragraph.
  if (shownIndex.current !== (current?.index ?? null)) {
    shownIndex.current = current?.index ?? null;
    if (fixNotice) setFixNotice("");
    if (editing) setEditing(false);
    if (activeRule !== null) setActiveRule(null);
  }

  const rawText = current ? current.text : "";
  const stagedText = current ? review.getText(current.index, rawText) : "";
  const isDirty = current ? stagedText !== rawText : false;

  // Marks are recomputed against the text on screen. After a fix the highlight
  // therefore disappears on its own, which is the feedback that it worked.
  const displayIssues = useMemo(() => {
    if (!current) return [] as Issue[];
    if (!isDirty) return current.issues;
    const fresh = analyseParagraph(current.index, stagedText);
    return fresh.issues.length > 0 ? fresh.issues : current.issues;
  }, [current, isDirty, stagedText]);

  const go = useCallback(
    (delta: number) => {
      setActiveRule(null);
      setEditing(false);
      setCursor((value) => {
        if (queue.length === 0) return 0;
        const next = value + delta;
        if (next < 0 || next >= queue.length) return value;
        return next;
      });
    },
    [queue.length],
  );

  const handleApplyFix = useCallback(
    (target: Issue) => {
      if (!current || target.kind !== "point" || target.suggestion === null) return;

      // Two different findings can cover the same characters. Applying both
      // would edit the wrong offsets and corrupt the paragraph, so the author is
      // told to look again rather than shown a wrong result.
      const applied = appliedRef.current.get(current.index) ?? [];
      const spans = target.spans ?? [{ start: target.start, end: target.end }];
      const collides = spans.some((draft) =>
        applied.some((done) => draft.start < done.end && done.start < draft.end),
      );
      if (collides) {
        setFixNotice(
          "That spot overlaps a fix you already applied. The marks have been refreshed - check the paragraph and apply again.",
        );
        return;
      }

      const base = review.getText(current.index, current.text);
      review.setText(current.index, applyFix(base, target));
      appliedRef.current.set(current.index, [...applied, ...spans]);
      setFixNotice("");
      setSaved(false);
    },
    [current, review],
  );

  const handleResetParagraph = useCallback(() => {
    if (!current) return;
    review.setText(current.index, current.text);
    setEditing(false);
    setSaved(false);
  }, [current, review]);

  /**
   * Writes an accepted AI correction into the staged text.
   *
   * The spans the AI rewrote are recorded as already-applied so a rule-based fix
   * can never be layered on top of the same characters, which would edit the
   * wrong offsets.
   */
  const handleAiApply = useCallback(
    ({ text, count }: { text: string; count: number }) => {
      if (!current) return;
      review.setText(current.index, text);
      appliedRef.current.delete(current.index);
      setFixNotice(
        count > 0
          ? `AI correction applied to this paragraph. It is staged in the browser until you save.`
          : "AI correction applied.",
      );
      setActiveRule(null);
      setSaved(false);
    },
    [current, review],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;
      if (typing) return;
      if (event.key === "j" || event.key === "J") go(1);
      if (event.key === "k" || event.key === "K") go(-1);
      if (event.key === "Enter" && current) {
        review.setReviewed(current.index, !review.isReviewed(current.index));
        setSaved(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, current, review]);

  const updateChapterMutation = useUpdateChapter(bookId, currentChapterId);

  const handleSave = async () => {
    if (!data) return;
    setSaveError("");
    try {
      const nextContent = replaceEditedParagraphs(
        content,
        analysis.format,
        review.state.edits,
      );
      await updateChapterMutation.mutateAsync({
        title: title.trim() || String(data.title ?? ""),
        content: nextContent,
        chapterNumber: Number(data.chapterNumber ?? 1),
      });
      review.clearEdits();
      setSaved(true);
    } catch {
      setSaveError("Could not save the chapter. Please try again.");
    }
  };

  const flaggedCount = analysis.flagged.length;
  const reviewedCount = analysis.paragraphs.filter((p) => review.isReviewed(p.index)).length;
  const progress =
    analysis.paragraphs.length === 0
      ? 100
      : Math.round((reviewedCount / analysis.paragraphs.length) * 100);

  if (isLoading) {
    return <div className="p-8 text-sm text-neutral-500">Loading chapter...</div>;
  }

  if (!data) {
    return <div className="p-8 text-sm text-neutral-500">Chapter not found.</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-5">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* ---------- header ---------- */}
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => router.push(`/books/${bookId}/chapters/${currentChapterId}`)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-neutral-100"
                aria-label="Back to chapter"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold md:text-lg">
                  Review: {String(data.title ?? "Untitled")}
                </h1>
                <p className="text-sm text-neutral-500">
                  Chapter {String(data.chapterNumber ?? "?")} · {analysis.paragraphs.length}{" "}
                  paragraphs · {analysis.totalIssues} findings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {review.editedIndices.length > 0 && (
                <span className="hidden text-sm text-neutral-600 sm:inline">
                  {review.editedIndices.length} corrected
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={updateChapterMutation.isPending || review.editedIndices.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {updateChapterMutation.isPending ? "Saving..." : "Save corrections"}
              </button>
            </div>
          </div>

          {saved && (
            <p role="status" className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              Corrections saved to the chapter.
            </p>
          )}
          {saveError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </p>
          )}
          {review.stale && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The chapter changed since it was last reviewed here, so the tick marks
                below may no longer match the text.
              </span>
            </div>
          )}
        </div>

        {/* ---------- quality summary ---------- */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">Proofread</p>
            <p className="mt-1 text-xl font-bold">{progress}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {reviewedCount}/{analysis.paragraphs.length} paragraphs
            </p>
          </div>

          {SEVERITY_ORDER.map((severity) => (
            <div key={severity} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[severity])} />
                <p className="text-xs text-neutral-500">{SEVERITY_LABEL[severity]}</p>
              </div>
              <p className="mt-1 text-xl font-bold">{analysis.counts[severity]}</p>
            </div>
          ))}
        </div>

        {flaggedCount === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-6 py-12 text-center">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <p className="font-medium text-green-900">No suspicious text found</p>
            <p className="max-w-md text-sm text-green-800">
              Nothing matched the checks for broken characters, wrong spacing, leftover
              English or model commentary. Still skim the chapter once.
            </p>
          </div>
        ) : (
          <>
            {/* ---------- navigator ---------- */}
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-neutral-500">
                  {queue.length} paragraph{queue.length === 1 ? "" : "s"} to look at ·
                  worst first
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                    <input
                      type="checkbox"
                      checked={showClean}
                      onChange={(event) => {
                        setShowClean(event.target.checked);
                        setCursor(0);
                      }}
                    />
                    Include clean paragraphs
                  </label>
                  <button
                    onClick={() => {
                      review.markAllReviewed(queue.map((p) => p.index));
                      setSaved(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all shown
                  </button>
                  <button
                    onClick={() => {
                      review.reset();
                      setSaved(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset progress
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {queue.map((paragraph, position) => {
                  const reviewed = review.isReviewed(paragraph.index);
                  return (
                    <button
                      key={paragraph.index}
                      onClick={() => {
                        setCursor(position);
                        setActiveRule(null);
                        setEditing(false);
                      }}
                      title={`Paragraph ${paragraph.index + 1}: ${paragraph.issues.length} finding(s)`}
                      className={cn(
                        "flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border px-2 text-xs transition",
                        position === safeCursor
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white hover:bg-neutral-100",
                      )}
                    >
                      {paragraph.index + 1}
                      {paragraph.worst && (
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            position === safeCursor ? "bg-white" : SEVERITY_DOT[paragraph.worst],
                          )}
                        />
                      )}
                      {reviewed && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---------- workspace ---------- */}
            {current && (
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                {/* left: the text */}
                <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Paragraph {current.index + 1}
                      {current.worst && (
                        <span
                          className={cn(
                            "ml-2 rounded-full border px-2 py-0.5 text-xs font-normal",
                            SEVERITY_BADGE[current.worst],
                          )}
                        >
                          {SEVERITY_LABEL[current.worst]}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDraft(stagedText);
                          setEditing((value) => !value);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                      >
                        {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        {editing ? "Done" : "Edit text"}
                      </button>
                    </div>
                  </div>

                  {editing ? (
                    <div className="space-y-2">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        className="chapter-content min-h-56 w-full rounded-md border px-3 py-2 text-base leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                        rows={10}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            review.setText(current.index, draft);
                            setEditing(false);
                            setSaved(false);
                          }}
                          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:opacity-90"
                        >
                          Apply edit
                        </button>
                        <button
                          onClick={() => setEditing(false)}
                          className="rounded-md border px-3 py-1.5 text-xs hover:bg-neutral-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="chapter-content text-base leading-relaxed text-neutral-800">
                      <HighlightedText
                        text={stagedText}
                        issues={displayIssues}
                        activeRule={activeRule}
                        onSelect={(issue) => setActiveRule(issue.rule)}
                      />
                    </p>
                  )}

                  {fixNotice && (
                    <p
                      role="status"
                      className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
                    >
                      {fixNotice}
                    </p>
                  )}

                  {isDirty && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span>Corrected in the browser. Save to write it to the chapter.</span>
                      <button
                        onClick={handleResetParagraph}
                        className="ml-auto shrink-0 underline hover:no-underline"
                      >
                        Undo paragraph
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <button
                      onClick={() => go(-1)}
                      disabled={safeCursor === 0}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      onClick={() => {
                        review.setReviewed(current.index, !review.isReviewed(current.index));
                        setSaved(false);
                        if (!review.isReviewed(current.index)) go(1);
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                        review.isReviewed(current.index)
                          ? "bg-green-100 text-green-900 hover:bg-green-200"
                          : "bg-neutral-900 text-white hover:opacity-90",
                      )}
                    >
                      <Check className="h-4 w-4" />
                      {review.isReviewed(current.index) ? "Checked" : "Mark as checked"}
                    </button>

                    <button
                      onClick={() => go(1)}
                      disabled={safeCursor >= queue.length - 1}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-2 text-center text-xs text-neutral-400">
                    Shortcuts: J next, K previous, Enter toggle checked
                  </p>
                </div>

                {/* right: findings */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <p className="mb-3 text-sm font-medium">
                      Findings ({displayIssues.length})
                    </p>

                    {displayIssues.length === 0 ? (
                      <p className="text-sm text-neutral-500">
                        Nothing left in this paragraph.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {displayIssues
                          .slice()
                          .sort(
                            (a, b) =>
                              a.start - b.start ||
                              SEVERITY_ORDER.indexOf(a.severity) -
                                SEVERITY_ORDER.indexOf(b.severity),
                          )
                          .map((issue) => {
                            const occurrences = issue.spans?.length ?? 1;
                            return (
                              <li
                                key={issue.rule}
                                onClick={() => setActiveRule(issue.rule)}
                                className={cn(
                                  "cursor-pointer rounded-lg border p-3 transition",
                                  activeRule === issue.rule
                                    ? "border-neutral-900 bg-neutral-50"
                                    : "border-neutral-200 hover:bg-neutral-50",
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    className={cn(
                                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                      SEVERITY_DOT[issue.severity],
                                    )}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">
                                      {issue.label}
                                      {occurrences > 1 && (
                                        <span className="ml-2 font-normal text-neutral-500">
                                          ×{occurrences}
                                        </span>
                                      )}
                                    </p>

                                    {issue.kind === "point" && issue.text && (
                                      <p className="mt-1 break-words font-mono text-xs text-neutral-500">
                                        {JSON.stringify(issue.text)}
                                      </p>
                                    )}

                                    {issue.fixHint && (
                                      <p className="mt-1 text-xs text-neutral-600">
                                        {issue.fixHint}
                                      </p>
                                    )}

                                    {issue.kind === "point" && issue.suggestion !== null && (
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleApplyFix(issue);
                                        }}
                                        className="mt-2 inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-xs text-white hover:opacity-90"
                                      >
                                        <Sparkles className="h-3 w-3" />
                                        {issue.suggestion === ""
                                          ? occurrences > 1
                                            ? `Delete all ${occurrences}`
                                            : "Delete it"
                                          : occurrences > 1
                                            ? `Fix all ${occurrences}`
                                            : "Fix it"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </div>

                  {/* AI sentence-structure review for this paragraph */}
                  <AiReviewPanel
                    text={stagedText}
                    disabled={editing}
                    onApply={handleAiApply}
                  />

                  {/* chapter-level context */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Info className="h-4 w-4 text-neutral-400" />
                      This paragraph
                    </p>
                    <dl className="space-y-1 text-xs text-neutral-600">
                      <div className="flex justify-between">
                        <dt>Characters</dt>
                        <dd>{stagedText.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Position in chapter</dt>
                        <dd>
                          {current.index + 1} / {analysis.paragraphs.length}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Status</dt>
                        <dd>{review.isReviewed(current.index) ? "Checked" : "Not checked"}</dd>
                      </div>
                    </dl>
                    <button
                      onClick={() => router.push(`/books/${bookId}/chapters/${currentChapterId}`)}
                      className="mt-3 w-full rounded-md border px-3 py-1.5 text-xs hover:bg-neutral-50"
                    >
                      Open in the chapter editor
                    </button>
                  </div>

                  {/* title, needed because the save endpoint sends it along */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    <label className="block space-y-1.5 text-sm font-medium">
                      <span>Chapter title</span>
                      <Input
                        value={title}
                        onChange={(event) => {
                          setTitleOverride(event.target.value);
                          setSaved(false);
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs text-neutral-500">
                      Sent together with the corrections when you save.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <p className="pb-4 text-center text-xs text-neutral-400">
          Review progress is stored in this browser only.{" "}
          <Link href={`/books/${bookId}`} className="underline">
            Back to the book
          </Link>
        </p>
      </div>
    </div>
  );
}
