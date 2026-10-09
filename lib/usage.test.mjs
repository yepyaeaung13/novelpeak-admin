/**
 * Tests for usage and cost reporting.
 *
 * Run with: pnpm test
 *
 * The cost figure is shown to the author, so wrong arithmetic here would
 * misrepresent what the feature costs. Prices used are gpt-6-luna:
 * $0.10 / 1M input, $0.01 / 1M cached input, $0.50 / 1M output.
 */

import { DEFAULT_PRICES, summariseUsage } from "./usage.ts";

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

const near = (a, b) => Math.abs(a - b) < 1e-9;

console.log("\n== no usage reported ==");
check("returns null", summariseUsage(undefined) === null);

console.log("\n== a plain call with no caching ==");
const plain = summariseUsage({ prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 });
// 1000 * 0.1/1e6 + 1000 * 0.5/1e6 = 0.0001 + 0.0005 = 0.0006
check("counts pass through", plain.promptTokens === 1000 && plain.completionTokens === 1000, plain);
check("cost is correct", near(plain.costUsd, 0.0006), plain.costUsd);
check("no cached tokens", plain.cachedTokens === 0, plain.cachedTokens);

console.log("\n== cached input is charged at the cached rate ==");
const cached = summariseUsage({
  prompt_tokens: 2000,
  completion_tokens: 1000,
  prompt_tokens_details: { cached_tokens: 1500 },
});
// fresh 500 * 0.1/1e6 = 0.00005; cached 1500 * 0.01/1e6 = 0.000015; out 1000*0.5/1e6 = 0.0005
check("cached counted", cached.cachedTokens === 1500, cached.cachedTokens);
check("cost is correct", near(cached.costUsd, 0.000565), cached.costUsd);

console.log("\n== caching makes it cheaper ==");
const uncachedSame = summariseUsage({ prompt_tokens: 2000, completion_tokens: 1000 });
check("cached < uncached", cached.costUsd < uncachedSame.costUsd, [cached.costUsd, uncachedSame.costUsd]);

console.log("\n== more cached tokens than prompt tokens cannot go negative ==");
const absurd = summariseUsage({
  prompt_tokens: 100,
  completion_tokens: 0,
  prompt_tokens_details: { cached_tokens: 9999 },
});
check("cached is clamped to prompt", absurd.cachedTokens === 100, absurd.cachedTokens);
check("cost is not negative", absurd.costUsd >= 0, absurd.costUsd);

console.log("\n== missing fields default to zero ==");
const sparse = summariseUsage({});
check("all zero", sparse.promptTokens === 0 && sparse.completionTokens === 0, sparse);
check("cost is zero", sparse.costUsd === 0, sparse.costUsd);

console.log("\n== total is derived when the provider omits it ==");
const derived = summariseUsage({ prompt_tokens: 300, completion_tokens: 200 });
check("total is the sum", derived.totalTokens === 500, derived.totalTokens);

console.log("\n== a realistic chapter paragraph ==");
// 300 Burmese characters at ~1.5 tokens/char, plus a 700-token system prompt,
// with the system prompt cached.
const real = summariseUsage({
  prompt_tokens: 1150,
  completion_tokens: 720,
  prompt_tokens_details: { cached_tokens: 700 },
});
// fresh 450 * 0.1/1e6 = 0.000045; cached 700*0.01/1e6 = 0.000007; out 720*0.5/1e6 = 0.00036
check("cost is about a tenth of a cent", near(real.costUsd, 0.000412), real.costUsd);
check("34 such paragraphs stay near 1.4 cents", Math.abs(real.costUsd * 34 - 0.014) < 0.0005, real.costUsd * 34);

console.log("\n== prices are configurable ==");
const free = summariseUsage(
  { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 },
  { input: 0, cachedInput: 0, output: 0 },
);
check("a zero price costs nothing", free.costUsd === 0, free.costUsd);

console.log("\n== defaults match the quoted gpt-6-luna prices ==");
check("input $0.10/1M", near(DEFAULT_PRICES.input * 1e6, 0.1), DEFAULT_PRICES.input * 1e6);
check("cached input $0.01/1M", near(DEFAULT_PRICES.cachedInput * 1e6, 0.01), DEFAULT_PRICES.cachedInput * 1e6);
check("output $0.50/1M", near(DEFAULT_PRICES.output * 1e6, 0.5), DEFAULT_PRICES.output * 1e6);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
