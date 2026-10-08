import type { DomCandidate, HealLocatorInput, HealLocatorOutput, HealLocatorSuggestion } from "../types.js";

/** Classic edit-distance, used for approximate text matching between the broken selector/intent and live candidates. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const an = a.trim().toLowerCase();
  const bn = b.trim().toLowerCase();
  if (!an || !bn) return 0;
  const dist = levenshtein(an, bn);
  return 1 - dist / Math.max(an.length, bn.length);
}

/** Pulls any quoted text or attribute-ish tokens out of a selector, as a fallback intent signal. */
function extractTokensFromSelector(selector: string): string[] {
  const quoted = [...selector.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  const idsOrClasses = [...selector.matchAll(/[.#]([a-zA-Z0-9_-]+)/g)].map((m) => m[1].replace(/-/g, " "));
  return [...quoted, ...idsOrClasses];
}

/**
 * Heuristic baseline: scores candidates by text similarity to the intent
 * (or tokens extracted from the broken selector), with a same-tag bonus.
 * This is intentionally a non-LLM baseline so the tool works with zero
 * external API calls; swap in an LLM-based ranker here for fuzzier matches
 * (e.g. "Submit" vs. "Confirm order") without changing HealLocatorOutput.
 */
export async function healLocator(input: HealLocatorInput): Promise<HealLocatorOutput> {
  const topN = input.topN ?? 3;
  const intentCandidates = input.intentText ? [input.intentText] : extractTokensFromSelector(input.brokenSelector);
  const originalTag = input.brokenSelector.match(/^([a-zA-Z]+)/)?.[1];

  const scored: HealLocatorSuggestion[] = input.candidates.map((c: DomCandidate) => {
    const textPool = [c.text, c.role, ...(c.attributes ? Object.values(c.attributes) : [])].filter(Boolean) as string[];

    let best = 0;
    let bestIntent = "";
    for (const intent of intentCandidates) {
      for (const candidateText of textPool.length ? textPool : [c.selector]) {
        const score = similarity(intent, candidateText);
        if (score > best) {
          best = score;
          bestIntent = intent;
        }
      }
    }

    const tagBonus = originalTag && c.tag.toLowerCase() === originalTag.toLowerCase() ? 0.1 : 0;
    const finalScore = Math.min(1, best + tagBonus);

    const reason = bestIntent
      ? `Text/attribute similarity to "${bestIntent}" (${(best * 100).toFixed(0)}%)${tagBonus ? " + same tag" : ""}`
      : "No strong text match; ranked by tag match only";

    return { selector: c.selector, score: Number(finalScore.toFixed(3)), reason };
  });

  scored.sort((a, b) => b.score - a.score);
  return { suggestions: scored.slice(0, topN) };
}
