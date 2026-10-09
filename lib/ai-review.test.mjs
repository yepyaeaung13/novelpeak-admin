/**
 * Tests for the AI sentence-review text handling.
 *
 * Run with: pnpm test
 *
 * applyChanges rewrites the author's paragraph, so these cover the ways a model
 * answer can be wrong: a substring that does not exist, changes that overlap
 * each other, and edits that would shift one another's offsets.
 */

import { applyChanges } from "./ai-review.ts";

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

const change = (before, after, kind = "grammar") => ({ before, after, kind, why: "" });

console.log("\n== a single change is applied ==");
const one = applyChanges("သူမသည် ကျောင်းသွားသည်", [change("ကျောင်းသွားသည်", "ကျောင်းသို့သွားသည်")]);
check("text replaced", one.text === "သူမသည် ကျောင်းသို့သွားသည်", one.text);
check("counted once", one.applied === 1, one.applied);

console.log("\n== several changes are applied together ==");
const many = applyChanges("က ခ ဂ", [change("က", "A"), change("ဂ", "C")]);
check("both applied", many.text === "A ခ C", many.text);
check("counted twice", many.applied === 2, many.applied);

console.log("\n== offsets do not drift when lengths differ ==");
// The first change is longer than the text it replaces; applying it before the
// second would move the second one's position if the order were wrong.
const drift = applyChanges("က ခ", [change("က", "အရှည်ကြီး"), change("ခ", "ဖ")]);
check("both land correctly", drift.text === "အရှည်ကြီး ဖ", drift.text);

console.log("\n== a change that is not present is skipped, not guessed ==");
const missing = applyChanges("က ခ", [change("ဇ", "Z")]);
check("text untouched", missing.text === "က ခ", missing.text);
check("counted zero", missing.applied === 0, missing.applied);

console.log("\n== overlapping changes: only the first is applied ==");
const overlap = applyChanges("abcdef", [change("abc", "X"), change("bcd", "Y")]);
check("first wins and text stays valid", overlap.text === "Xdef", overlap.text);
check("counted once", overlap.applied === 1, overlap.applied);

console.log("\n== a deletion empties the span ==");
const deletion = applyChanges("က ခ ဂ", [change("ခ ", "")]);
check("span removed", deletion.text === "က ဂ", deletion.text);

console.log("\n== an insertion adds text ==");
const insertion = applyChanges("ကခ", [change("က", "က ြ")]);
check("text inserted", insertion.text === "က ြခ", insertion.text);

console.log("\n== an empty before is ignored (it would match everywhere) ==");
const empty = applyChanges("က ခ", [change("", "Z")]);
check("text untouched", empty.text === "က ခ", empty.text);
check("counted zero", empty.applied === 0, empty.applied);

console.log("\n== no changes is a no-op ==");
const none = applyChanges("က ခ", []);
check("text unchanged", none.text === "က ခ", none.text);
check("counted zero", none.applied === 0, none.applied);

console.log("\n== applying the model's whole paragraph is byte-exact ==");
const corrected = "သူမသည် ကျောင်းသို့သွားသည် ။";
check("verbatim use", applyChanges("ဘာမှမဖြစ်", [change("ဘာမှမဖြစ်", corrected)]).text === corrected);

console.log("\n== a repeated substring only matches the first occurrence ==");
const repeated = applyChanges("က က က", [change("က", "X")]);
check("first occurrence replaced", repeated.text === "X က က", repeated.text);
check("counted once", repeated.applied === 1, repeated.applied);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
