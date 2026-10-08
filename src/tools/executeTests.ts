import { run } from "../utils/shell.js";
import { classifyFailure } from "./analyzeFailure.js";
import type { ExecuteTestsInput, ExecuteTestsOutput, TestFailure } from "../types.js";

/**
 * Parses Playwright's default console reporter output. Good-enough for a v1 —
 * swap to the JSON reporter (`--reporter=json`) and parse that instead once
 * you need exact per-test timing/attachments.
 */
function parsePlaywrightOutput(stdout: string, stderr: string): { passed: number; failed: number; skipped: number; failures: TestFailure[] } {
  const combined = stdout + "\n" + stderr;
  const passed = (combined.match(/(\d+) passed/)?.[1]) ?? "0";
  const failed = (combined.match(/(\d+) failed/)?.[1]) ?? "0";
  const skipped = (combined.match(/(\d+) skipped/)?.[1]) ?? "0";

  const failures: TestFailure[] = [];
  const failureBlocks = combined.split(/\d+\)\s/).slice(1);
  for (const block of failureBlocks) {
    const testName = block.split("\n")[0]?.trim() ?? "unknown test";
    const message = block.slice(0, 600).trim();
    failures.push({ testName, message, category: classifyFailure(message).category });
  }

  return { passed: Number(passed), failed: Number(failed), skipped: Number(skipped), failures };
}

/** Parses pytest's default short summary output ("N passed, M failed in Ss"). */
function parsePytestOutput(stdout: string, stderr: string): { passed: number; failed: number; skipped: number; failures: TestFailure[] } {
  const combined = stdout + "\n" + stderr;
  const passed = (combined.match(/(\d+) passed/)?.[1]) ?? "0";
  const failed = (combined.match(/(\d+) failed/)?.[1]) ?? "0";
  const skipped = (combined.match(/(\d+) skipped/)?.[1]) ?? "0";

  const failures: TestFailure[] = [];
  const sectionSplit = combined.split(/_{5,}\s/).slice(1);
  for (const block of sectionSplit) {
    const testName = block.split("\n")[0]?.trim() ?? "unknown test";
    const message = block.slice(0, 600).trim();
    failures.push({ testName, message, category: classifyFailure(message).category });
  }

  return { passed: Number(passed), failed: Number(failed), skipped: Number(skipped), failures };
}

export async function executeTests(input: ExecuteTestsInput): Promise<ExecuteTestsOutput> {
  const timeoutMs = input.timeoutMs ?? 120_000;

  const [command, args] =
    input.runner === "playwright"
      ? ["npx", ["playwright", "test", input.path, ...(input.extraArgs ?? [])]]
      : ["python3", ["-m", "pytest", input.path, ...(input.extraArgs ?? [])]];

  const result = await run(command, args, { timeoutMs });

  const parsed = input.runner === "playwright" ? parsePlaywrightOutput(result.stdout, result.stderr) : parsePytestOutput(result.stdout, result.stderr);

  const tail = (result.stdout + "\n" + result.stderr).trim();

  return {
    passed: parsed.passed,
    failed: parsed.failed,
    skipped: parsed.skipped,
    durationMs: result.durationMs,
    exitCode: result.timedOut ? -1 : result.exitCode,
    failures: parsed.failures,
    rawOutputTail: tail.length > 2000 ? tail.slice(-2000) : tail
  };
}
