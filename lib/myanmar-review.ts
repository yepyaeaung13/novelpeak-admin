/**
 * Myanmar chapter review engine.
 *
 * Chapters are written with an LLM and pasted in, so the text is long and the
 * author cannot proofread all of it. This module narrows attention to the
 * paragraphs that are probably wrong and, where it can, proposes a fix.
 *
 * Everything here is pure and synchronous so it can run on every keystroke and
 * be unit-tested without a DOM.
 */

export type Severity = "high" | "medium" | "low" | "info";

export interface Issue {
  rule: string;
  /** "point" underlines a span; "paragraph" is a whole-paragraph verdict. */
  kind: "point" | "paragraph";
  severity: Severity;
  /** 0-based offsets into the paragraph text. */
  start: number;
  end: number;
  /**
   * Every remaining occurrence of the same rule, when a paragraph repeats one
   * problem. One entry in the findings list, but each occurrence stays
   * independently fixable and marked on screen.
   */
  spans?: Array<{ start: number; end: number }>;
  /** The exact offending slice. */
  text: string;
  /** Reader-facing explanation of what is wrong. */
  label: string;
  /**
   * Replacement for the span starting at `start`, or null when the fix is
   * manual. When `spans` is present the same replacement applies to each.
   */
  suggestion: string | null;
  /** Why the suggested replacement is right. */
  fixHint: string | null;
}

export interface Paragraph {
  index: number;
  text: string;
}

export interface ParagraphAnalysis {
  index: number;
  text: string;
  issues: Issue[];
  /** Rank used to show the worst paragraphs first. */
  score: number;
  worst: Severity | null;
}

export interface ChapterSource {
  /** "html" round-trips back to HTML via paragraphsToHtml; "text" stays plain. */
  format: "html" | "text";
  paragraphs: Paragraph[];
}

export interface ChapterAnalysis {
  format: "html" | "text";
  paragraphs: ParagraphAnalysis[];
  /** Paragraph indices that carry at least one medium-or-worse issue. */
  flagged: number[];
  counts: Record<Severity, number>;
  totalIssues: number;
}

/* ------------------------------------------------------------------ */
/* Character classes                                                   */
/* ------------------------------------------------------------------ */

// Consonants and independent vowels: a legal base for a syllable.
const BASE = "[\\u1000-\\u102A\\u103F]";
// Dependent vowel signs (excluding U+1039 virama and U+103A asat).
const VOWEL = "[\\u102B-\\u1038]";
// Tone marks and the asat, all of which must follow a base or a stack.
const TONE = "[\\u1036-\\u1038\\u103A]";
// Medials (ya, ra, wa, ha) and the virama.
const MEDIAL = "[\\u1039\\u103B-\\u103E]";

// A complete, well-formed Myanmar syllable cluster.
const SYLLABLE = new RegExp(
  `${BASE}(?:${MEDIAL}${BASE}|${MEDIAL}|${VOWEL}|${TONE})*`,
  "g",
);

/**
 * Zawgyi-only code points, U+105A–U+1097.
 *
 * The rest of the Myanmar block is deliberately excluded. U+1050–U+1059 are
 * legitimate Unicode (independent vowels and punctuation) that Zawgyi merely
 * reuses for different letters, so flagging them would fire on correct text.
 */
const ZAWGYI_MARKERS = new Set([
  "\u105A", "\u105B", "\u105C", "\u105D", "\u105E", "\u105F",
  "\u1060", "\u1061", "\u1062", "\u1063", "\u1064", "\u1065", "\u1066",
  "\u1067", "\u1068", "\u1069", "\u106A", "\u106B", "\u106C", "\u106D",
  "\u106E", "\u106F", "\u1070", "\u1071", "\u1072", "\u1073", "\u1074",
  "\u1075", "\u1076", "\u1077", "\u1078", "\u1079", "\u107A", "\u107B",
  "\u107C", "\u107D", "\u107E", "\u107F", "\u1080", "\u1081", "\u1082",
  "\u1083", "\u1084", "\u1085", "\u1086", "\u1087", "\u1088", "\u1089",
  "\u108A", "\u108B", "\u108C", "\u108D", "\u108E", "\u108F",
  "\u1090", "\u1091", "\u1092", "\u1093", "\u1094", "\u1095", "\u1096", "\u1097",
]);

/**
 * A virama that is not followed by a consonant. This is the one structural
 * defect that is unambiguous in Unicode: the stack marker has nothing to stack,
 * so it renders as a stray dotted circle.
 */
const ORPHAN_VIRAMA = /\u1039(?![\u1000-\u102A\u103F])/g;

/**
 * Myanmar punctuation.
 *
 * What is deliberately NOT checked, because correct writing uses both forms and
 * a rule would have to flag one of them:
 *   - spacing before the sentence mark U+104B (။). It is normally written
 *     straight against the last word — "အိပ်ပျော်သွားခဲ့သည်။" — but a space
 *     before it is not wrong either.
 *   - spacing before the phrase mark U+104A (၊), for exactly the same reason.
 *     Real chapters write it attached — "ကောင်းခန့်၊ ဖြည်းဖြည်းနင်းဦးဟ" and
 *     "နှစ်လှမ်း၊ သုံးလှမ်း။" are both correct — so requiring a space reported
 *     four false positives in a single chapter.
 *   - runs of spaces, which are cosmetic.
 *
 * What remains is only text that no correct writing produces: a mark repeated.
 */
const PUNCTUATION_RULES: ReadonlyArray<{
  pattern: RegExp;
  replacement: string;
  label: string;
  hint: string;
  severity: Severity;
}> = [
  {
    pattern: /\u104A\u104A+/g,
    replacement: "\u104A",
    label: "Duplicated phrase mark \u104A",
    hint: "One \u104A is enough between phrases.",
    severity: "medium",
  },
  {
    pattern: /\u104B\u104B+/g,
    replacement: "\u104B",
    label: "Duplicated sentence mark \u104B",
    hint: "One \u104B closes a sentence.",
    severity: "medium",
  },
];

function detectPunctuation(text: string): Issue[] {
  const out: Issue[] = [];

  for (const rule of PUNCTUATION_RULES) {
    for (const m of matches(rule.pattern, text)) {
      // The replacement has to differ from the matched span, otherwise there is
      // nothing to offer. Comparing spans (not the whole paragraph) keeps this
      // check meaningful even for a zero-width match.
      if (rule.replacement === m[0]) continue;
      out.push(
        issue(
          "punctuation",
          rule.severity,
          m.index,
          m.index + m[0].length,
          m[0],
          rule.label,
          rule.replacement,
          rule.hint,
        ),
      );
    }
  }

  return out;
}

/** Phrases an LLM leaves behind when it talks about the text instead of writing it. */
const AI_ARTIFACTS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\bas an ai\b/gi, label: "Model disclaimer left in the text" },
  { pattern: /\bi(?:'| a)?m sorry\b/gi, label: "Model apology left in the text" },
  { pattern: /\bi (?:cannot|can't|can not)\b/gi, label: "Model refusal left in the text" },
  { pattern: /\blanguage model\b/gi, label: "Model disclaimer left in the text" },
  { pattern: /\bi hope (?:this|that) helps\b/gi, label: "Model sign-off left in the text" },
  { pattern: /\bhere(?:'s| is) (?:the|your|a)\b/gi, label: "Model preamble left in the text" },
  { pattern: /\b(?:sure|of course|certainly)[,!]/gi, label: "Model preamble left in the text" },
  { pattern: /\bas requested\b/gi, label: "Model aside left in the text" },
  { pattern: /\bnote:|\btranslation:|\bedited:|\brevised:/gi, label: "Editorial note left in the text" },
  { pattern: /^\s*(?:chapter|ch\.?)\s*\d+\s*$/gim, label: "Chapter heading repeated inside the body" },
];

/** Markdown that survives a copy-paste out of a chat window. */
const MARKDOWN_RULES: ReadonlyArray<{ pattern: RegExp; label: string; hint: string }> = [
  { pattern: /\*\*/g, label: "Markdown bold markers", hint: "Remove the ** or the text will show them to readers." },
  { pattern: /^\s{0,3}#{1,6}\s+/gm, label: "Markdown heading marker", hint: "Use a plain line or the chapter title field instead." },
  { pattern: /^\s*[-*]\s+/gm, label: "Markdown list marker", hint: "Convert to a plain line or Myanmar numbering." },
  { pattern: /^\s*\|.*\|\s*$/gm, label: "Markdown table row", hint: "Tables do not render in the reader; rewrite as prose." },
  { pattern: /^\s*```/gm, label: "Markdown code fence", hint: "Remove the fence." },
  { pattern: /^\s*&[a-z]+;\s*$/gim, label: "HTML entity on its own line", hint: "Remove the entity or replace it with the character it means." },
];

/* ------------------------------------------------------------------ */
/* Chunking                                                            */
/* ------------------------------------------------------------------ */

const stripTags = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const looksLikeHtml = (raw: string) => /<\/?(?:p|div|br|h[1-6]|li|blockquote|strong|em|img)\b/i.test(raw);

/** Rough content hash, used to detect that a chapter changed since it was reviewed. */
export function hashText(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 + c, 0x85ebca6b) ^ (h2 >>> 13);
  }
  return ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16)).padStart(16, "0");
}

/**
 * Split chapter content into paragraphs. Accepts the HTML the editor produces
 * and plain text, which is what a paste out of ChatGPT looks like.
 */
export function chapterToParagraphs(raw: string): ChapterSource {
  const content = (raw ?? "").replace(/\r\n?/g, "\n");
  const format: "html" | "text" = looksLikeHtml(content) ? "html" : "text";

  const pieces = format === "html"
    ? content
        .split(/<\/(?:p|div|h[1-6]|li|blockquote)>|<br\s*\/?>\s*<br\s*\/?>/i)
        .map(stripTags)
        .map((s) => s.trim())
    : content.split(/\n\s*\n/).map((s) => s.trim());

  const paragraphs: Paragraph[] = [];
  for (const piece of pieces) {
    // A paragraph holding only an image still matters to the reader, but it has
    // no prose to proofread, so it is kept but will analyse as clean.
    if (!piece && paragraphs.length === 0) continue;
    if (!piece) continue;
    paragraphs.push({ index: paragraphs.length, text: piece });
  }

  return { format, paragraphs };
}

/** Rebuild the chapter body in the shape it arrived in. */
export function paragraphsToContent(paragraphs: string[], format: "html" | "text"): string {
  const kept = paragraphs.map((p) => p.trim()).filter(Boolean);
  if (format === "text") return kept.join("\n\n");
  return kept.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

/**
 * Rebuild chapter content after a review, replacing only the paragraphs that
 * were corrected.
 *
 * Untouched paragraphs keep their original markup. A blanket rebuild would strip
 * every bold, link and inline image in the chapter, which is a much worse
 * outcome than the typo being fixed. Corrected text is escaped and its line
 * breaks become `<br />`, so a paragraph that used line breaks survives the trip
 * through the review editor.
 */
export function replaceEditedParagraphs(
  raw: string,
  format: "html" | "text",
  edits: Record<number, string>,
): string {
  const { paragraphs } = chapterToParagraphs(raw);

  if (format === "text") {
    return paragraphs
      .map((p) => edits[p.index] ?? p.text)
      .filter((p) => p.trim())
      .join("\n\n");
  }

  // Split on paragraph boundaries but keep the closing tags, so the pieces can
  // be reassembled in order. Opening tags may carry attributes and are left as
  // they were.
  const pieces = (raw ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/(?<=<\/(?:p|div|h[1-6]|li|blockquote)>)/i)
    .filter((piece) => piece.trim());

  let paragraphIndex = 0;
  const rebuilt = pieces.map((piece) => {
    if (!looksLikeHtml(piece)) return piece;
    const current = paragraphIndex++;
    const replacement = edits[current];
    if (replacement === undefined) return piece;
    const opening = piece.match(/^\s*<([a-z][a-z0-9]*)\b[^>]*>/i);
    const tag = opening ? opening[1] : "p";
    const body = escapeHtml(replacement).replace(/\n/g, "<br />");
    return `<${tag}>${body}</${tag}>`;
  });

  const missing = Object.keys(edits)
    .map(Number)
    .filter((index) => index >= paragraphIndex)
    .sort((a, b) => a - b);
  for (const index of missing) {
    const body = escapeHtml(edits[index]).replace(/\n/g, "<br />");
    rebuilt.push(`<p>${body}</p>`);
  }

  return rebuilt.join("");
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

const SEVERITY_WEIGHT: Record<Severity, number> = {
  high: 100,
  medium: 40,
  low: 12,
  info: 3,
};

const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2, info: 3 };

const issue = (
  rule: string,
  severity: Severity,
  start: number,
  end: number,
  text: string,
  label: string,
  suggestion: string | null = null,
  fixHint: string | null = null,
): Issue => ({ rule, kind: "point", severity, start, end, text, label, suggestion, fixHint });

/**
 * A verdict about the whole paragraph rather than a span inside it. These carry
 * no fixable range, so they are exempt from overlap resolution — otherwise a
 * point issue sitting at offset 0 would silently swallow them.
 */
const paragraphIssue = (
  rule: string,
  severity: Severity,
  label: string,
  fixHint: string | null = null,
): Issue => ({
  rule,
  kind: "paragraph",
  severity,
  start: 0,
  end: 0,
  text: "",
  label,
  suggestion: null,
  fixHint,
});

/** Every match of a global regex, with offsets. A fresh regex avoids shared lastIndex. */
function matches(re: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    out.push(m);
    if (m.index === rx.lastIndex) rx.lastIndex++;
  }
  return out;
}

interface Span {
  start: number;
  end: number;
}

/**
 * Offsets covered by a well-formed syllable cluster. This is the backbone of
 * every "detached mark" rule: a vowel sign or tone mark is valid exactly when it
 * falls inside a cluster, which is far more reliable than guessing at which
 * neighbours are legal. Burmese legitimately stacks marks in ways that make
 * hand-written lookahead rules produce false alarms.
 */
function syllableSpans(text: string): Span[] {
  return matches(SYLLABLE, text).map((m) => ({ start: m.index, end: m.index + m[0].length }));
}

function insideSpans(spans: Span[], at: number): boolean {
  let lo = 0;
  let hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = spans[mid];
    if (at < s.start) hi = mid - 1;
    else if (at >= s.end) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * Zawgyi detection.
 *
 * This project writes Unicode only, so these checks exist purely to catch text
 * that arrived from somewhere else. Both encodings occupy the same Unicode
 * block, which makes most structural tests unreliable, so only code points that
 * carry no Unicode Myanmar meaning at all are reported — they are proof, not a
 * guess. A separate note is raised when a whole paragraph looks Zawgyi-encoded,
 * since a full conversion is a different job from a retype.
 */
function detectZawgyi(text: string): Issue[] {
  const out: Issue[] = [];

  for (const ch of new Set(text)) {
    if (!ZAWGYI_MARKERS.has(ch)) continue;
    const first = text.indexOf(ch);
    out.push(
      issue(
        "zawgyi-codepoint",
        "high",
        first,
        first + 1,
        ch,
        "Zawgyi-only character in Unicode text",
        null,
        "This code point has no Unicode Myanmar meaning, so readers on the web see a wrong glyph or an empty box. Retype the word with a Unicode Myanmar keyboard.",
      ),
    );
  }

  const marked = out.length;
  if (marked >= 3) {
    out.push(
      paragraphIssue(
        "zawgyi-paragraph",
        "high",
        "This paragraph looks entirely Zawgyi-encoded",
        "A whole paragraph in the old encoding needs converting rather than a few retypes. Convert the source to Unicode and paste it again.",
      ),
    );
  }

  return out;
}

/** Combining marks that cannot stand on their own, plus a detached asat. */
function detectOrphanMarks(text: string, spans: Span[]): Issue[] {
  const out: Issue[] = [];

  for (const m of matches(new RegExp(`[${VOWEL.slice(1, -1)}]`, "g"), text)) {
    if (insideSpans(spans, m.index)) continue;
    out.push(
      issue(
        "orphan-mark",
        "high",
        m.index,
        m.index + 1,
        m[0],
        "Vowel or tone mark with no base letter",
        "",
        "The mark lost the consonant it belongs to, so it renders detached. Delete it or retype the syllable.",
      ),
    );
  }

  // The asat is legal, but only when it sits inside a cluster; otherwise it has
  // nothing to attach to. Checking the cluster is what keeps words such as
  // ကျွန် and ဗုဒ္ဓ from being reported.
  for (const m of matches(/\u103A/g, text)) {
    if (insideSpans(spans, m.index)) continue;
    out.push(
      issue(
        "orphan-asat",
        "high",
        m.index,
        m.index + 1,
        "\u103A",
        "Asat mark with no base letter",
        "",
        "The asat has nothing to attach to. Delete it or retype the syllable.",
      ),
    );
  }

  return out;
}

/** A stack marker with nothing to stack. */
function detectStacks(text: string, spans: Span[]): Issue[] {
  const out: Issue[] = [];

  for (const m of matches(ORPHAN_VIRAMA, text)) {
    if (insideSpans(spans, m.index)) continue;
    out.push(
      issue(
        "bad-stack",
        "high",
        m.index,
        m.index + 1,
        "\u1039",
        "Stack marker with no consonant after it",
        "",
        "The stack marker must be followed by a consonant. Delete it or retype this cluster.",
      ),
    );
  }

  return out;
}

function detectAiArtifacts(text: string): Issue[] {
  const out: Issue[] = [];

  for (const artifact of AI_ARTIFACTS) {
    for (const m of matches(artifact.pattern, text)) {
      out.push(
        issue("ai-artifact", "high", m.index, m.index + m[0].length, m[0], artifact.label, "", "Delete it. This is the model talking about the text, not the novel."),
      );
    }
  }

  for (const md of MARKDOWN_RULES) {
    for (const m of matches(md.pattern, text)) {
      out.push(
        issue("markdown", "medium", m.index, m.index + m[0].length, m[0], md.label, "", md.hint),
      );
    }
  }

  return out;
}

/**
 * Burmese repeats words as grammar, not as an error. နည်းနည်း ("a little"),
 * မြန်မြန် ("quickly"), ဖြည်းဖြည်း ("slowly") and အမျိုးမျိုး ("various") are all
 * single words built by reduplication, and a doubled word is normal emphasis.
 *
 * So this reports only what reduplication never produces: the same run three or
 * more times in a row. A repeat of two is never reported, because that is
 * exactly what နည်းနည်း looks like.
 *
 * The two patterns below must stay strictly consecutive. An earlier attempt
 * allowed optional whitespace between repetitions, which let the matcher skip
 * over unrelated text and reported almost every sentence.
 */
function detectRepetition(text: string): Issue[] {
  const out: Issue[] = [];
  const reported = new Set<number>();

  const push = (start: number, end: number, matched: string, unit: string, severity: Severity) => {
    if (reported.has(start)) return;
    // A unit with no letter or digit is spacing or a run of punctuation, not a
    // repeated word.
    if (!/[\p{L}\p{N}]/u.test(unit)) return;
    reported.add(start);
    out.push(
      issue(
        "repetition",
        severity,
        start,
        end,
        matched,
        "The same text repeated in a row",
        unit,
        severity === "high"
          ? "Keep one copy. This is the repetition loop models fall into."
          : "Keep one copy. Burmese doubles a word for emphasis, but three or more in a row is the repetition loop models fall into.",
      ),
    );
  };

  // Three or more repetitions with no space between them.
  // The minimum unit of three characters keeps two-syllable reduplication out.
  for (const m of matches(/([\u1000-\u109F\w]{3,12}?)\1{2,}/g, text)) {
    push(m.index, m.index + m[0].length, m[0], m[1], "medium");
  }

  // The same, written as separate words. The next word is taken with a
  // lookahead so the match cannot end on a trailing space, which would otherwise
  // pull a space into the suggested replacement.
  for (const m of matches(/(\S+?)(?=(?:\s+\1){2,})/g, text)) {
    const unit = m[1];
    if (unit.length < 2) continue;
    const end = m.index + unit.length * 3 + 2;
    push(m.index, Math.min(end, text.length), text.slice(m.index, Math.min(end, text.length)), unit, "medium");
  }

  // A long run repeated immediately, which no reduplicated word can produce.
  for (const m of matches(/(.{8,40}?)\1+/g, text)) {
    push(m.index, m.index + m[0].length, m[0], m[1], "high");
  }

  return out;
}

function detectMixedNumerals(text: string): Issue[] {
  const myanmar = /[\u1040-\u1049]/.test(text);
  const ascii = /[0-9]/.test(text);
  if (!myanmar || !ascii) return [];

  const first = text.search(/[0-9]/);
  return [
    issue(
      "mixed-numerals",
      "low",
      Math.max(0, first),
      Math.max(1, first + 1),
      text[Math.max(0, first)] ?? "",
      "Myanmar and Arabic digits in the same paragraph",
      null,
      "Pick one style for the whole chapter so numbers read consistently.",
    ),
  ];
}

function detectWhitespace(text: string): Issue[] {
  const out: Issue[] = [];

  for (const m of matches(/[\u200B\u200C\u200D\uFEFF]/g, text)) {
    out.push(
      issue("zero-width", "low", m.index, m.index + 1, "\u200B", "Invisible character", "", "Delete it. It hides inside words and breaks search and text-to-speech."),
    );
  }

  for (const m of matches(/\u00A0/g, text)) {
    out.push(issue("nbsp", "low", m.index, m.index + 1, "\u00A0", "Non-breaking space", " ", "Replace with a normal space."));
  }

  for (const m of matches(/[ \t]+$/gm, text)) {
    out.push(issue("trailing-space", "info", m.index, m.index + m[0].length, m[0], "Trailing whitespace", "", "Harmless, but easy to strip."));
  }

  return out;
}

function detectScriptNoise(text: string): Issue[] {
  const out: Issue[] = [];

  for (const m of matches(/[\u4E00-\u9FFF\u0E00-\u0E7F\u0400-\u04FF\u0600-\u06FF]/g, text)) {
    out.push(
      issue("foreign-script", "high", m.index, m.index + 1, m[0], "Character from an unrelated script", "", "Chinese, Thai, Cyrillic or Arabic text inside a Myanmar chapter is almost always a paste error."),
    );
  }

  for (const m of matches(/(?:\uFF01|\uFF1F|\uFF0C|\uFF1B|\uFF1A|\u3002)/g, text)) {
    out.push(
      issue("wide-punctuation", "medium", m.index, m.index + 1, m[0], "Full-width punctuation", "", "Use the Myanmar or ASCII punctuation the rest of the chapter uses."),
    );
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

/** Rules that only need the raw text. */
const SIMPLE_RULES = [
  detectZawgyi,
  detectAiArtifacts,
  detectScriptNoise,
  detectRepetition,
  detectPunctuation,
  detectMixedNumerals,
  detectWhitespace,
];

/** Rules that reason about syllable structure. */
const SPAN_RULES = [detectOrphanMarks, detectStacks];

function severityOf(issues: Issue[]): Severity | null {
  let worst: Severity | null = null;
  for (const i of issues) {
    if (!worst || severityRank[i.severity] < severityRank[worst]) worst = i.severity;
  }
  return worst;
}

export function analyseParagraph(index: number, text: string): ParagraphAnalysis {
  const spans = syllableSpans(text);

  const found: Issue[] = [];
  for (const rule of SIMPLE_RULES) found.push(...rule(text));
  for (const rule of SPAN_RULES) found.push(...rule(text, spans));

  // When two rules describe the same stretch of text, keep the more serious one
  // so the author is never shown a duplicate of the same spot. Paragraph-level
  // verdicts have no span, so they always survive.
  found.sort(
    (a, b) =>
      a.start - b.start ||
      severityRank[a.severity] - severityRank[b.severity] ||
      b.end - b.start - (a.end - a.start),
  );
  const kept: Issue[] = [];
  for (const candidate of found) {
    if (candidate.kind === "paragraph") {
      kept.push(candidate);
      continue;
    }
    const clash = kept.some(
      (k) => k.kind === "point" && candidate.start < k.end && k.start < candidate.end,
    );
    if (!clash) kept.push(candidate);
  }

  // Then collapse repeats of one rule within the paragraph — a paragraph with
  // four missing spaces has one problem, not four, and listing it four times
  // buries the findings that differ.
  //
  // The grouping key is the rule *and* the replacement, because one rule can
  // carry incompatible fixes: "။။" is both a duplicated mark to delete and a
  // mark missing its space, and those two cannot share one suggestion.
  const merged = new Map<string, Issue>();
  const ordered: Issue[] = [];
  for (const item of kept) {
    if (item.kind === "paragraph") {
      ordered.push(item);
      continue;
    }
    const key = `${item.rule}\u0000${item.suggestion ?? "\u0001"}`;
    const existing = merged.get(key);
    if (!existing) {
      const copy: Issue = { ...item };
      merged.set(key, copy);
      ordered.push(copy);
      continue;
    }
    const spans = existing.spans ?? [{ start: existing.start, end: existing.end }];
    // Overlapping occurrences would be applied twice, so keep only disjoint
    // ones. A repeated character legitimately produces two identical
    // zero-width fixes (one space for ၊ and one for ။ at the same offset), so
    // an exact duplicate is kept while a genuine overlap is dropped.
    const duplicate = spans.some((s) => s.start === item.start && s.end === item.end);
    const overlaps = spans.some((s) => item.start < s.end && s.start < item.end);
    if (!duplicate && !overlaps) spans.push({ start: item.start, end: item.end });
    existing.spans = spans;
  }

  const score = ordered.reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);
  return { index, text, issues: ordered, score, worst: severityOf(ordered) };
}

export function analyseChapter(raw: string): ChapterAnalysis {
  const { format, paragraphs } = chapterToParagraphs(raw);
  const analysed = paragraphs.map((p) => analyseParagraph(p.index, p.text));

  const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0, info: 0 };
  let totalIssues = 0;
  for (const p of analysed) {
    for (const i of p.issues) {
      counts[i.severity]++;
      totalIssues++;
    }
  }

  const flagged = analysed
    .filter((p) => p.worst === "high" || p.worst === "medium")
    .map((p) => p.index);

  return { format, paragraphs: analysed, flagged, counts, totalIssues };
}

/**
 * Apply one issue's suggestion, fixing every occurrence that issue covers.
 *
 * Edits are applied from the end of the paragraph backwards for two reasons: an
 * earlier replacement would otherwise shift the offsets of later spans, and for
 * the zero-width insertion rules (a missing space) it is what applies the same
 * offset twice correctly, which is needed when a phrase mark and a sentence mark
 * are adjacent.
 *
 * A paragraph-level verdict carries no suggestion, so it is left untouched.
 */
export function applyFix(text: string, target: Issue): string {
  if (target.kind !== "point" || target.suggestion === null) return text;

  const spans = (target.spans ?? [{ start: target.start, end: target.end }])
    .slice()
    // Longest, right-most first, so an earlier replacement cannot shift a later
    // span and a deletion is applied before an insertion at the same offset.
    .sort((a, b) => b.start - a.start || b.end - a.end);

  let result = text;
  for (const span of spans) {
    result = result.slice(0, span.start) + target.suggestion + result.slice(span.end);
  }
  return result;
}

/**
 * Paragraphs worth the author's time, worst first. Clean paragraphs are left
 * out unless `includeClean` is set, which is the whole point: they only have to
 * read the doubtful ones.
 */
export function reviewQueue(analysis: ChapterAnalysis, includeClean = false): ParagraphAnalysis[] {
  const list = includeClean
    ? analysis.paragraphs.slice()
    : analysis.paragraphs.filter((p) => p.issues.length > 0);
  return list.sort((a, b) => b.score - a.score || a.index - b.index);
}
