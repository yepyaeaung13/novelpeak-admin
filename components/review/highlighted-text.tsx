"use client";

import { Fragment, useMemo } from "react";
import type { Issue, Severity } from "@/lib/myanmar-review";
import { cn } from "@/lib/utils";

/**
 * Renders one paragraph with the flagged spots marked, so the author can see
 * exactly which characters are in question instead of re-reading the whole
 * paragraph.
 */

const SEVERITY_MARK: Record<Severity, string> = {
  high: "bg-red-100 text-red-950 decoration-red-400",
  medium: "bg-amber-100 text-amber-950 decoration-amber-400",
  low: "bg-sky-100 text-sky-950 decoration-sky-400",
  info: "bg-neutral-100 text-neutral-700 decoration-neutral-400",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: "Must fix",
  medium: "Likely wrong",
  low: "Worth a look",
  info: "Note",
};

export const SEVERITY_BADGE: Record<Severity, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-sky-100 text-sky-800 border-sky-200",
  info: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

export const SEVERITY_DOT: Record<Severity, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
  info: "bg-neutral-400",
};

interface HighlightedTextProps {
  text: string;
  issues: Issue[];
  activeRule?: string | null;
  onSelect?: (issue: Issue) => void;
  className?: string;
}

interface Segment {
  start: number;
  end: number;
  issue: Issue;
}

/**
 * Zero-width issues (a missing space is an insertion point) cannot be drawn, so
 * they are widened to one visible character while keeping their real offsets for
 * the fix itself.
 */
function toSegment(issue: Issue, start: number, end: number, length: number): Segment {
  if (end > start) return { start, end, issue };
  const safeStart = Math.max(0, Math.min(start, Math.max(0, length - 1)));
  return { start: safeStart, end: Math.min(length, safeStart + 1), issue };
}

/** Flattens an issue into one segment per occurrence it covers. */
function segmentsOf(issue: Issue, length: number): Segment[] {
  const spans = issue.spans ?? [{ start: issue.start, end: issue.end }];
  return spans.map((span) => toSegment(issue, span.start, span.end, length));
}

export function HighlightedText({
  text,
  issues,
  activeRule = null,
  onSelect,
  className,
}: HighlightedTextProps) {
  const segments = useMemo(() => {
    const mapped = issues
      .filter((issue) => issue.kind === "point")
      .flatMap((issue) => segmentsOf(issue, text.length))
      .filter((s) => s.end > s.start && s.start < text.length);

    // Draw wider spans first so a narrow mark stays visible on top of them.
    mapped.sort((a, b) => a.start - b.start || b.end - a.end);

    const kept: Segment[] = [];
    let cursor = 0;
    for (const segment of mapped) {
      if (segment.start < cursor) continue; // already covered by a wider mark
      kept.push(segment);
      cursor = segment.end;
    }
    return kept;
  }, [issues, text.length]);

  if (segments.length === 0) {
    return <span className={cn("whitespace-pre-wrap", className)}>{text}</span>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const [position, segment] of segments.entries()) {
    if (segment.start > cursor) {
      nodes.push(
        <Fragment key={`plain-${cursor}`}>{text.slice(cursor, segment.start)}</Fragment>,
      );
    }

    const isActive = activeRule !== null && activeRule === segment.issue.rule;
    nodes.push(
      <mark
        key={`mark-${position}-${segment.start}`}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        title={segment.issue.label}
        onClick={onSelect ? () => onSelect(segment.issue) : undefined}
        onKeyDown={
          onSelect
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(segment.issue);
                }
              }
            : undefined
        }
        className={cn(
          "rounded-sm bg-transparent px-0.5 underline decoration-wavy decoration-1 underline-offset-4",
          SEVERITY_MARK[segment.issue.severity],
          onSelect && "cursor-pointer",
          isActive && "ring-2 ring-neutral-900/40 ring-offset-1",
        )}
      >
        {text.slice(segment.start, segment.end)}
      </mark>,
    );

    cursor = segment.end;
  }

  if (cursor < text.length) {
    nodes.push(<Fragment key={`plain-${cursor}`}>{text.slice(cursor)}</Fragment>);
  }

  return <span className={cn("whitespace-pre-wrap", className)}>{nodes}</span>;
}
