"use client";

/**
 * Review progress for one chapter, kept in the browser.
 *
 * The backend has no field for "this chapter has been proofread", so the app
 * tracks it locally. The stored content hash is what keeps that honest: if the
 * chapter changes after a review, the progress is reported as stale instead of
 * silently claiming the text was checked.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hashText } from "@/lib/myanmar-review";

export interface ChapterReviewState {
  /** Paragraph indices the author has marked as checked. */
  reviewed: number[];
  /** Paragraph index -> corrected text, staged in the browser. */
  edits: Record<number, string>;
  /** Hash of the chapter content the review was performed against. */
  contentHash: string;
  updatedAt: number;
}

const STORAGE_PREFIX = "novelpeak:chapter-review:";

const emptyState = (contentHash: string): ChapterReviewState => ({
  reviewed: [],
  edits: {},
  contentHash,
  updatedAt: Date.now(),
});

function storageKey(chapterId: string) {
  return `${STORAGE_PREFIX}${chapterId}`;
}

function readState(chapterId: string): ChapterReviewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(chapterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChapterReviewState>;
    if (typeof parsed?.contentHash !== "string") return null;
    return {
      reviewed: Array.isArray(parsed.reviewed) ? parsed.reviewed.filter((n) => typeof n === "number") : [],
      edits:
        parsed.edits && typeof parsed.edits === "object"
          ? (parsed.edits as Record<number, string>)
          : {},
      contentHash: parsed.contentHash,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    // A corrupt or unreadable store must never break the chapter page.
    return null;
  }
}

function writeState(chapterId: string, state: ChapterReviewState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(chapterId), JSON.stringify(state));
  } catch {
    // Quota or privacy mode: review still works for this session.
  }
}

export interface UseChapterReviewResult {
  state: ChapterReviewState;
  /** False until localStorage has been read, so SSR and the client agree. */
  loaded: boolean;
  /** True when the chapter changed since it was reviewed. */
  stale: boolean;
  isReviewed: (index: number) => boolean;
  getText: (index: number, fallback: string) => string;
  setReviewed: (index: number, value: boolean) => void;
  markAllReviewed: (indices: number[]) => void;
  setText: (index: number, text: string) => void;
  clearEdits: () => void;
  reset: () => void;
  /** Paragraph indices with staged corrections. */
  editedIndices: number[];
}

export function useChapterReview(
  chapterId: string,
  content: string,
): UseChapterReviewResult {
  const contentHash = useMemo(() => hashText(content), [content]);
  const [state, setState] = useState<ChapterReviewState>(() => emptyState(""));
  const [loaded, setLoaded] = useState(false);
  const chapterRef = useRef(chapterId);

  useEffect(() => {
    chapterRef.current = chapterId;
    const stored = readState(chapterId);
    setState(stored ?? emptyState(contentHash));
    setLoaded(true);
    // contentHash is intentionally excluded: this effect loads per chapter, and
    // re-running it on every keystroke would fight the author's own edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const update = useCallback(
    (mutate: (current: ChapterReviewState) => ChapterReviewState) => {
      setState((current) => {
        const next = { ...mutate(current), updatedAt: Date.now() };
        writeState(chapterRef.current, next);
        return next;
      });
    },
    [],
  );

  const isReviewed = useCallback(
    (index: number) => state.reviewed.includes(index),
    [state.reviewed],
  );

  const getText = useCallback(
    (index: number, fallback: string) => state.edits[index] ?? fallback,
    [state.edits],
  );

  const setReviewed = useCallback(
    (index: number, value: boolean) => {
      update((current) => ({
        ...current,
        contentHash,
        reviewed: value
          ? Array.from(new Set([...current.reviewed, index])).sort((a, b) => a - b)
          : current.reviewed.filter((i) => i !== index),
      }));
    },
    [update, contentHash],
  );

  const markAllReviewed = useCallback(
    (indices: number[]) => {
      update((current) => ({
        ...current,
        contentHash,
        reviewed: Array.from(new Set([...current.reviewed, ...indices])).sort((a, b) => a - b),
      }));
    },
    [update, contentHash],
  );

  const setText = useCallback(
    (index: number, text: string) => {
      update((current) => ({
        ...current,
        contentHash,
        edits: { ...current.edits, [index]: text },
      }));
    },
    [update, contentHash],
  );

  const clearEdits = useCallback(() => {
    update((current) => ({ ...current, edits: {}, contentHash }));
  }, [update, contentHash]);

  const reset = useCallback(() => {
    update(() => emptyState(contentHash));
  }, [update, contentHash]);

  const editedIndices = useMemo(
    () =>
      Object.keys(state.edits)
        .map(Number)
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b),
    [state.edits],
  );

  return {
    state,
    loaded,
    stale: loaded && state.contentHash !== "" && state.contentHash !== contentHash,
    isReviewed,
    getText,
    setReviewed,
    markAllReviewed,
    setText,
    clearEdits,
    reset,
    editedIndices,
  };
}
