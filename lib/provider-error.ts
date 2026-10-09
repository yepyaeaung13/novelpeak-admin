/**
 * Turns a provider's error response into something the author can act on.
 *
 * Separate from the route so it can be tested: providers overload HTTP statuses
 * in ways that are easy to misread. OpenAI reports an exhausted balance as 429,
 * exactly like a rate limit, and the two need completely different responses.
 */

export function describeProviderError(
  status: number,
  detail: string,
  code = "",
  type = "",
): string {
  const signal = `${code} ${type} ${detail}`;

  if (/credit_balance_exhausted|insufficient_quota|no credits|billing/i.test(signal)) {
    return "The AI account has run out of credit. Add credit with the provider, or point AI_REVIEW_BASE_URL at a different provider.";
  }
  // Checked before the key branches: a country restriction also arrives as 403,
  // and "your key was rejected" would send the author looking in the wrong place.
  if (/country|region|territor/i.test(signal)) {
    return "The AI provider is refusing requests from this country. Try a different provider via AI_REVIEW_BASE_URL.";
  }
  if (status === 401 || status === 403) {
    return "The AI key was rejected. Check AI_REVIEW_API_KEY in .env, and that AI_REVIEW_BASE_URL matches the provider that issued it.";
  }
  if (status === 402) {
    return "The AI account has no credit left.";
  }
  if (status === 404) {
    return "The AI provider does not recognise that model. Check AI_REVIEW_MODEL in .env.";
  }
  if (status === 429) {
    return "The AI rate limit is used up. Wait a moment and try again.";
  }
  return detail || `The AI service returned ${status}.`;
}
