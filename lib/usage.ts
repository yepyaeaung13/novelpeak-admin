/**
 * Turns a provider's reported token usage into a cost.
 *
 * Separate from the route so it can be tested: this is the number the author
 * sees, and silently wrong arithmetic here would misrepresent what the feature
 * costs. Prices are per million tokens.
 */

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

export interface UsageSummary {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface Prices {
  input: number;
  cachedInput: number;
  output: number;
}

/** Defaults match gpt-6-luna; override in .env when the provider changes. */
export const DEFAULT_PRICES: Prices = {
  input: 0.1 / 1e6,
  cachedInput: 0.01 / 1e6,
  output: 0.5 / 1e6,
};

export function summariseUsage(
  usage: TokenUsage | undefined,
  prices: Prices = DEFAULT_PRICES,
): UsageSummary | null {
  if (!usage) return null;

  const promptTokens = usage.prompt_tokens ?? 0;
  // A provider could report more cached tokens than prompt tokens; clamping
  // stops the cached portion from going negative and inflating the cost.
  const cachedTokens = Math.min(promptTokens, usage.prompt_tokens_details?.cached_tokens ?? 0);
  const freshInput = promptTokens - cachedTokens;
  const completionTokens = usage.completion_tokens ?? 0;

  const cost =
    freshInput * prices.input + cachedTokens * prices.cachedInput + completionTokens * prices.output;

  return {
    promptTokens,
    cachedTokens,
    completionTokens,
    totalTokens: usage.total_tokens ?? promptTokens + completionTokens,
    costUsd: Number(cost.toFixed(6)),
  };
}
