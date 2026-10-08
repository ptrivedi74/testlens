import type { AnalyzeFailureInput, AnalyzeFailureOutput, FailureCategory } from "../types.js";

interface Rule {
  category: FailureCategory;
  pattern: RegExp;
  confidence: number;
  likelyCause: string;
  suggestedNextStep: string;
}

// Ordered: first match wins. This is a deliberately simple, auditable
// baseline — the natural upgrade path is to replace classifyFailure's body
// with an LLM call that takes the same input and returns the same shape,
// without changing the tool's contract in schemas.ts.
const RULES: Rule[] = [
  {
    category: "timeout",
    pattern: /timeout|timed out|exceeded.*ms/i,
    confidence: 0.8,
    likelyCause: "An operation (navigation, selector wait, or network call) did not complete within the allotted time.",
    suggestedNextStep: "Check whether the app was slow to respond in this run, or whether the wait condition is too strict for current load."
  },
  {
    category: "element-not-found",
    pattern: /no (element|node) (found|matches)|locator.*not found|waiting for selector|strict mode violation/i,
    confidence: 0.85,
    likelyCause: "The selector used by the test does not currently match anything on the page.",
    suggestedNextStep: "Run heal_locator with the broken selector and a fresh DOM snapshot to get ranked replacement candidates."
  },
  {
    category: "network",
    pattern: /ECONNREFUSED|ENOTFOUND|network error|fetch failed|net::ERR_|connection refused/i,
    confidence: 0.75,
    likelyCause: "A network call failed outright rather than returning an unexpected result.",
    suggestedNextStep: "Confirm the target environment/URL is reachable and not an auth or DNS issue before treating this as a product regression."
  },
  {
    category: "assertion",
    pattern: /expect\(.*\)\.|AssertionError|assert .* ==|toBe\(|toEqual\(|toContainText/i,
    confidence: 0.8,
    likelyCause: "The test ran to completion but an actual value did not match the expected value.",
    suggestedNextStep: "Compare expected vs. actual in the message below; this is the most likely category to be a genuine regression."
  },
  {
    category: "environment",
    pattern: /ENOENT|permission denied|command not found|module not found|cannot find module|EACCES/i,
    confidence: 0.7,
    likelyCause: "The test environment is missing a dependency, file, or permission needed to run at all.",
    suggestedNextStep: "Check the run environment/setup rather than the application code — this usually isn't a product bug."
  }
];

export function classifyFailure(errorText: string): { category: FailureCategory; confidence: number; likelyCause: string; suggestedNextStep: string } {
  for (const rule of RULES) {
    if (rule.pattern.test(errorText)) {
      return { category: rule.category, confidence: rule.confidence, likelyCause: rule.likelyCause, suggestedNextStep: rule.suggestedNextStep };
    }
  }
  return {
    category: "unknown",
    confidence: 0.3,
    likelyCause: "The error text did not match any known pattern.",
    suggestedNextStep: "Inspect the raw error manually; consider adding a rule (or an LLM-based classifier) for this pattern."
  };
}

export async function analyzeFailure(input: AnalyzeFailureInput): Promise<AnalyzeFailureOutput> {
  const result = classifyFailure(input.errorText);
  return { ...result };
}
