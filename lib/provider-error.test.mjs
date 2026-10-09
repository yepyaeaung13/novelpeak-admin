/**
 * Tests for provider error reporting.
 *
 * Run with: pnpm test
 *
 * These exist because a real bug shipped here: OpenAI reports an exhausted
 * balance as HTTP 429 with code "credit_balance_exhausted", the code mapped that
 * to a rate-limit message, and the wrong advice sent the search for the cause in
 * entirely the wrong direction.
 */

import { describeProviderError } from "./provider-error.ts";

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

console.log("\n== an exhausted balance is NOT reported as a rate limit ==");
const exhausted = describeProviderError(
  429,
  "You have no credits remaining. Add credits to continue using the API.",
  "credit_balance_exhausted",
  "insufficient_quota",
);
check("mentions credit", /credit/i.test(exhausted), exhausted);
check("does not mention rate limit", !/rate limit/i.test(exhausted), exhausted);

console.log("\n== a genuine rate limit still reads as one ==");
const limited = describeProviderError(429, "Rate limit reached for gpt-4o-mini", "rate_limit_exceeded", "");
check("mentions rate limit", /rate limit/i.test(limited), limited);
check("does not mention credit", !/credit/i.test(limited), limited);

console.log("\n== a bad key ==");
check("401 is a key problem", /key was rejected/i.test(describeProviderError(401, "Incorrect API key provided")), describeProviderError(401, "Incorrect API key provided"));
check("403 is a key problem", /key was rejected/i.test(describeProviderError(403, "Forbidden")), describeProviderError(403, "Forbidden"));

console.log("\n== a wrong model name ==");
check("404 names the model setting", /AI_REVIEW_MODEL/.test(describeProviderError(404, "The model does not exist")), describeProviderError(404, "The model does not exist"));

console.log("\n== a country block is called out ==");
check("country message", /country/i.test(describeProviderError(403, "Not available in your country or region")), describeProviderError(403, "Not available in your country or region"));

console.log("\n== an unrecognised error keeps the provider's own wording ==");
const other = describeProviderError(500, "Internal server error");
check("detail preserved", other === "Internal server error", other);
check("empty detail falls back to the status", /500/.test(describeProviderError(500, "")), describeProviderError(500, ""));

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
