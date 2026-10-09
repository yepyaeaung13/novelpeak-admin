/**
 * Tests for the Myanmar chapter review engine.
 *
 * Run with: pnpm test
 *
 * The engine encodes assumptions about Burmese that are easy to break and
 * expensive to get wrong: a rule that fires on correct text makes the whole
 * review screen worthless, because the author stops trusting it. The
 * false-positive corpus below is the most important part of this file.
 */

import {
  analyseChapter,
  analyseParagraph,
  applyFix,
  chapterToParagraphs,
  paragraphsToContent,
  replaceEditedParagraphs,
  reviewQueue,
} from "./myanmar-review.ts";

let failures = 0;

function check(label, condition, extra) {
  if (!condition) {
    failures++;
    console.log(`  FAIL  ${label}`);
    if (extra !== undefined) console.log(`        ${JSON.stringify(extra)}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}

const pa = (t) => analyseParagraph(0, t);
const rulesOf = (t) => pa(t).issues.map((i) => i.rule);
const sevOf = (t) => pa(t).worst;
const has = (t, rule) => rulesOf(t).includes(rule);
const count = (t, rule) => pa(t).issues.filter((i) => i.rule === rule).length;

/* ------------------------------------------------------------------ */
/* Correct Burmese must stay silent                                    */
/* ------------------------------------------------------------------ */

console.log("\n== ordinary Burmese produces no medium-or-worse finding ==");
const ordinary = [
  "သူမသည် တောအုပ်ထဲသို့ လျှောက်သွားခဲ့သည် ။",
  "ထိုအခါ မိုးသည်းထန်စွာ ရွာသွန်းလာသည် ။",
  "ကျွန်တော် ဒီစာအုပ်ကို ဖတ်ချင်တယ် ။",
  "မြန်မာနိုင်ငံသည် အရှေ့တောင်အာရှတွင် တည်ရှိသည် ။",
  "သူမ၏ အသံသည် နူးညံ့သိမ်မွေ့လှသည် ။",
  "ဗုဒ္ဓ ၏ အဆုံးအမများကို လိုက်နာသည် ။",
  "သူမသည် ကျွန်တော်၏ သူငယ်ချင်း ဖြစ်သည် ။",
  "နေ့တိုင်း ကျောင်းသွားရသည် ။",
  "ရေသောက်ပြီး အိပ်ရာဝင်ခဲ့သည် ။",
  "ဒီဇာတ်ကောင်က အတော်လေး စိတ်ဝင်စားစရာကောင်းတယ် ။",
  "အိပ်ပျော်သွားခဲ့သည်။",
  "သူမသည် ပင်ပန်းနွမ်းနယ်နေသဖြင့် ချက်ချင်း အိပ်ပျော်သွားခဲ့သည်။",
];
for (const sentence of ordinary) {
  const worst = sevOf(sentence);
  check(
    `clean: ${sentence.slice(0, 24)}...`,
    worst === null || worst === "low" || worst === "info",
    rulesOf(sentence),
  );
}

// These two orderings are normal Unicode Burmese and were the source of the
// worst false positives during development.
console.log("\n== normal Burmese orderings are never flagged ==");
check("asat + tone mark (သည်) is fine", rulesOf("သည်").length === 0, rulesOf("သည်"));
check("asat + tone mark (များ) is fine", rulesOf("များ").length === 0, rulesOf("များ"));
check("word-final asat (ကျွန်) is fine", !has("ကျွန်", "orphan-asat"), rulesOf("ကျွန်"));
check("legal Pali stack (ဗုဒ္ဓ) is fine", !has("ဗုဒ္ဓ", "bad-stack"), rulesOf("ဗုဒ္ဓ"));
check("Pali stack is not called Zawgyi", !has("ဗုဒ္ဓ", "zawgyi-codepoint"), rulesOf("ဗုဒ္ဓ"));

// Burmese reduplication is grammar. Flagging it would make the whole review
// screen useless, because it appears in ordinary prose constantly.
console.log("\n== reduplicated words are correct Burmese, never repetition ==");
const reduplicated = [
  "နည်းနည်းသုံးဖူးပါတယ်။ အကုန်တော့ မကျွမ်းကျင်သေးဘူး။",
  "သူမသည် နည်းနည်း လေ့လာခဲ့သည် ။",
  "မြန်မြန် လျှောက်ပါ ။",
  "အလွန်အလွန် ကောင်းသည် ။",
  "ဖြည်းဖြည်း ချင်း လုပ်ပါ ။",
  "ကောင်းကောင်း လုပ်ပါ ။",
  "အမျိုးမျိုး ရှိသည် ။",
  "သူမသည် လျှောက်လျှောက် သွားသည် ။",
  "တစ်ခုခု ဖြစ်သည် ။",
  "ကြီးကြီးမားမား ဖြစ်သည် ။",
  "အိမ်တွင်း အိမ်ပြင် ရှင်းလင်းသည် ။",
];
for (const sentence of reduplicated) {
  check(`not repetition: ${sentence.slice(0, 26)}...`, !has(sentence, "repetition"), rulesOf(sentence));
}

console.log("\n== a genuine model loop is still caught ==");
check("three identical words in a row", has("ထိုအခါ ထိုအခါ ထိုအခါ သူမသည်", "repetition"), rulesOf("ထိုအခါ ထိုအခါ ထိုအခါ သူမသည်"));
check("a long run repeated", has("သူမသည် ပြန်လာခဲ့သည်သူမသည် ပြန်လာခဲ့သည်", "repetition"), rulesOf("သူမသည် ပြန်လာခဲ့သည်သူမသည် ပြန်လာခဲ့သည်"));
check("a word merely doubled is not a loop", !has("နည်းနည်း သုံးသည်", "repetition"), rulesOf("နည်းနည်း သုံးသည်"));

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

// Both marks are written directly against the preceding word in ordinary
// Myanmar prose, so neither one's spacing may ever be reported. Verified against
// a real 6,410-character chapter, where requiring a space before ၊ produced four
// false positives in four sentences.
console.log("\n== neither sentence nor phrase mark spacing is an error ==");
const attached = "အိပ်ပျော်သွားခဲ့သည်။";
check("attached ။ is clean", rulesOf(attached).length === 0, rulesOf(attached));
check("attached ။ is not repetition", !has(attached, "repetition"), rulesOf(attached));
check("a longer attached sentence is clean", rulesOf("သူမသည် တောအုပ်ထဲသို့ လျှောက်သွားခဲ့သည်။").length === 0, rulesOf("သူမသည် တောအုပ်ထဲသို့ လျှောက်သွားခဲ့သည်။"));
check("a spaced ။ is also clean", rulesOf("သူမသည် လျှောက်သွားခဲ့သည် ။").length === 0, rulesOf("သူမသည် လျှောက်သွားခဲ့သည် ။"));
check("a doubled ။ is still a typo", has("က။။", "punctuation"), rulesOf("က။။"));

// Real sentences from the author's chapter 1.
const realPhraseMarks = [
  "ကောင်းခန့်၊ ဖြည်းဖြည်းနင်းဦးဟ",
  "နှစ်လှမ်း၊ သုံးလှမ်း။",
  "ဟုတ်၊ လာပြီအန်တီ။",
  "မိနစ်နှစ်ဆယ်၊ အစိတ်လောက်ပဲ။",
];
for (const sentence of realPhraseMarks) {
  check(`attached ၊ is clean: ${sentence.slice(0, 22)}...`, !has(sentence, "punctuation"), rulesOf(sentence));
}
check("a doubled ၊ is still a typo", has("က၊၊", "punctuation"), rulesOf("က၊၊"));

console.log("\n== Zawgyi that arrived from elsewhere ==");
check("Zawgyi-only code point is high", has("သူ\u105Aကို", "zawgyi-codepoint") && sevOf("သူ\u105Aကို") === "high", rulesOf("သူ\u105Aကို"));
check("a dense paragraph is escalated", has("\u105A\u105B\u105Cက", "zawgyi-paragraph"), rulesOf("\u105A\u105B\u105Cက"));

console.log("\n== detached marks ==");
check("vowel with no base", has("\u102Bက", "orphan-mark"), rulesOf("\u102Bက"));
check("asat with no base", has("\u103Aက", "orphan-asat"), rulesOf("\u103Aက"));
check("stack marker with no consonant", has("\u1039 က", "bad-stack"), rulesOf("\u1039 က"));

console.log("\n== text that should never have been pasted ==");
check("model preamble", has("**Sure, here is the revised chapter**", "ai-artifact"), rulesOf("**Sure, here is the revised chapter**"));
check("model disclaimer", has("As an AI language model, I cannot", "ai-artifact"), rulesOf("As an AI language model, I cannot"));
check("markdown bold", has("**Chapter 5**", "markdown"), rulesOf("**Chapter 5**"));
check("markdown heading", has("## Chapter 5", "markdown"), rulesOf("## Chapter 5"));
check("unrelated script", has("သူမသည် 小说 ဖတ်သည်", "foreign-script"), rulesOf("သူမသည် 小说 ဖတ်သည်"));
check("full-width punctuation", has("က \uFF01", "wide-punctuation"), rulesOf("က \uFF01"));
check("reduplication is not a loop", !has("သူမသည် အလွန်အလွန်ကောင်းသည်", "repetition"), rulesOf("သူမသည် အလွန်အလွန်ကောင်းသည်"));
check("repetition loop", has("ထိုအခါ ထိုအခါ ထိုအခါ သူမသည်", "repetition"), rulesOf("ထိုအခါ ထိုအခါ ထိုအခါ သူမသည်"));
check("invisible character", has("က\u200Bခ", "zero-width"), rulesOf("က\u200Bခ"));
// English words are deliberate code-switching in Myanmar writing — the
// BURMESE-SAN corpus explicitly preserves English-Burmese code-switching as
// authentic usage. A real chapter contained "missed call" and "apron", both
// intentional, so this must never be reported.
check("English inside Burmese is not an error", !has("သူမသည် really good ဖြစ်သည်", "latin-text"), rulesOf("သူမသည် really good ဖြစ်သည်"));
check("a lone English noun is fine", rulesOf("အညိုဖျော့ရောင် apron တစ်ထည် ဝတ်ထားသည်။").length === 0, rulesOf("အညိုဖျော့ရောင် apron တစ်ထည် ဝတ်ထားသည်။"));
check("a two-word English phrase is fine", rulesOf("အမေ့ဆီက missed call နှစ်ခါ။").length === 0, rulesOf("အမေ့ဆီက missed call နှစ်ခါ။"));
check("mixed digit systems", has("အခန်း 5 နှင့် ၆", "mixed-numerals"), rulesOf("အခန်း 5 နှင့် ၆"));

/* ------------------------------------------------------------------ */
/* One finding per problem                                             */
/* ------------------------------------------------------------------ */

console.log("\n== repeated problems are reported once, not once per occurrence ==");
check("markdown bold is one finding", count("**Chapter 5**", "markdown") === 1, rulesOf("**Chapter 5**"));
check("both asterisk pairs recorded", (pa("**Chapter 5**").issues.find((i) => i.rule === "markdown")?.spans?.length ?? 1) === 2);
check("two stray characters are one finding", count("သူမသည် 小说 ဖတ်သည်", "foreign-script") === 1, rulesOf("သူမသည် 小说 ဖတ်သည်"));
check("scoring ignores occurrence count", analyseParagraph(0, "က။။").score === analyseParagraph(0, "က။။ ခ။။").score);

console.log("\n== a finding's spans never overlap ==");
const mixed = "သူမသည် လျှောက်သည်။ က  ခ။";
for (const issue of pa(mixed).issues) {
  const spans = (issue.spans ?? [{ start: issue.start, end: issue.end }])
    .slice()
    .sort((a, b) => a.start - b.start);
  check(
    `no overlap in ${issue.rule}/${JSON.stringify(issue.suggestion)}`,
    spans.every((s, n) => n === 0 || s.start >= spans[n - 1].end),
    spans,
  );
}

/* ------------------------------------------------------------------ */
/* Fixes                                                               */
/* ------------------------------------------------------------------ */

console.log("\n== every occurrence is fixed in one call ==");
console.log("\n== every occurrence of one fix is applied in a single call ==");
// Two different marks need two findings, because each has its own replacement.
const gaps = "က၊၊ ခ၊၊ ဂ၊၊";
const gapsFix = pa(gaps).issues.find((i) => i.rule === "punctuation");
check("one finding covers all three", (gapsFix?.spans?.length ?? 1) === 3, gapsFix && gapsFix.spans);
check("all three collapsed at once", applyFix(gaps, gapsFix) === "က၊ ခ၊ ဂ၊", applyFix(gaps, gapsFix));

// A different mark is a different fix, so it stays its own finding.
const twoMarks = "က၊၊ ခ။။";
const twoMarkFixes = pa(twoMarks).issues.filter((i) => i.rule === "punctuation");
check("two distinct marks produce two findings", twoMarkFixes.length === 2, twoMarkFixes.map((i) => i.suggestion));
check(
  "the phrase mark collapses",
  applyFix(twoMarks, twoMarkFixes.find((i) => i.suggestion === "\u104A")) === "က၊ ခ။။",
);
check(
  "the sentence mark collapses",
  applyFix(twoMarks, twoMarkFixes.find((i) => i.suggestion === "\u104B")) === "က၊၊ ခ။",
);

const dups = "က။။ ခ။။";
const dupsFix = pa(dups).issues.find((i) => i.suggestion === "\u104B");
check("duplicate removal covers both", (dupsFix?.spans?.length ?? 1) === 2, dupsFix && dupsFix.spans);
check("both collapsed", applyFix(dups, dupsFix) === "က။ ခ။", dupsFix && applyFix(dups, dupsFix));

console.log("\n== paragraph-level verdicts carry no automatic fix ==");
const zawgyiPara = pa("\u105A\u105B\u105Cက ။").issues.find((i) => i.kind === "paragraph");
check("paragraph verdict has no suggestion", zawgyiPara?.suggestion === null, zawgyiPara);
check("applying it is a no-op", applyFix("\u105A\u105B\u105Cက ။", zawgyiPara) === "\u105A\u105B\u105Cက ။");

/* ------------------------------------------------------------------ */
/* Chunking and saving                                                 */
/* ------------------------------------------------------------------ */

console.log("\n== chunking accepts both the editor's HTML and a plain paste ==");
const htmlSource = chapterToParagraphs("<p>ပထမစာပိုဒ် ။</p><p>ဒုတိယစာပိုဒ် ။</p>");
check("HTML detected", htmlSource.format === "html", htmlSource.format);
check("tags stripped", htmlSource.paragraphs[0].text === "ပထမစာပိုဒ် ။", htmlSource.paragraphs[0].text);
check("both paragraphs found", htmlSource.paragraphs.length === 2, htmlSource.paragraphs.length);

const textSource = chapterToParagraphs("ပထမစာပိုဒ် ။\n\nဒုတိယစာပိုဒ် ။");
check("plain text detected", textSource.format === "text", textSource.format);
check("both paragraphs found", textSource.paragraphs.length === 2, textSource.paragraphs.length);

console.log("\n== round trips ==");
check("plain text", paragraphsToContent(["က", "ခ"], "text") === "က\n\nခ");
check("html", paragraphsToContent(["က", "ခ"], "html") === "<p>က</p><p>ခ</p>");
check("html escaping", paragraphsToContent(["a<b>c"], "html") === "<p>a&lt;b&gt;c</p>");

console.log("\n== saving preserves the chapter's existing markup ==");
const A = "ပထမစာပိုဒ် ပထမ ။";
const B = "ဒုတိယစာပိုဒ် ဒုတိယ ။";
const C = "တတိယစာပိုဒ် တတိယ ။";
const chapterHtml = `<p>${A}</p><p><strong>${B}</strong></p><p>${C}</p>`;

check("no edits means byte-identical output", replaceEditedParagraphs(chapterHtml, "html", {}) === chapterHtml);
const oneEdit = replaceEditedParagraphs(chapterHtml, "html", { 1: `${B} ပြင်` });
check("edited paragraph is replaced", oneEdit.includes(`${B} ပြင်`), oneEdit);
check("untouched paragraphs keep their markup", oneEdit.includes(`<p>${A}</p>`) && oneEdit.includes(`<p>${C}</p>`), oneEdit);
check("no paragraph is lost", oneEdit.split("<p").length === 4, oneEdit);
check("injected markup is escaped", replaceEditedParagraphs(chapterHtml, "html", { 0: "<script>x</script>" }).includes("&lt;script&gt;"));
check("line breaks survive", replaceEditedParagraphs("<p>x</p>", "html", { 0: "တစ်\nနှစ်" }).includes("<br />"));
check("plain text stays plain", replaceEditedParagraphs(`${A}\n\n${B}`, "text", { 1: `${B} x` }) === `${A}\n\n${B} x`);

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

console.log("\n== the queue puts the worst paragraph first and hides clean ones ==");
const ranked = analyseChapter(`${ordinary[0]}\n\nသူ\u105Aက\n\n${ordinary[1]}`);
const queue = reviewQueue(ranked);
check("broken paragraph ranks first", queue[0]?.text === "သူ\u105Aက", queue.map((p) => p.text));
check("clean paragraphs are excluded", reviewQueue(ranked, false).every((p) => p.issues.length > 0));
check("they can be included on request", reviewQueue(ranked, true).length === 3, reviewQueue(ranked, true).length);

const totals = analyseChapter("**a**\n\nသူမသည် လျှောက်သည်။\n\nက။။");
check(
  "chapter totals are coherent",
  totals.totalIssues === totals.counts.high + totals.counts.medium + totals.counts.low + totals.counts.info,
  { total: totals.totalIssues, counts: totals.counts },
);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
