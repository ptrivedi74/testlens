/**
 * Shared types used across TestLens tools.
 * Kept framework-agnostic so new runners/engines can be added
 * without touching the MCP tool contracts in schemas.ts.
 */

export type RunnerKind = "playwright" | "pytest";

export interface GenerateTestsInput {
  /** Short, human-readable name for the generated test file. */
  name: string;
  /** Which runner to generate code for. */
  runner: RunnerKind;
  /** Base URL of the app under test (required for playwright UI flows). */
  baseUrl?: string;
  /** Ordered list of steps describing the flow to test. */
  steps: TestStep[];
  /** Directory (relative to project root) to write the generated file into. */
  outputDir?: string;
}

export interface TestStep {
  /** What kind of action this step performs. */
  action: "goto" | "click" | "fill" | "assertText" | "assertVisible" | "apiRequest";
  /** CSS selector, role, or field name the action targets (not needed for "goto"). */
  target?: string;
  /** Value to type, URL to navigate to, or expected text, depending on action. */
  value?: string;
  /** For apiRequest steps: HTTP method. */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** For apiRequest steps: expected status code. */
  expectStatus?: number;
}

export interface GenerateTestsOutput {
  filePath: string;
  runner: RunnerKind;
  linesGenerated: number;
  preview: string;
}

export interface ExecuteTestsInput {
  /** Path (relative to project root) to the test file or directory to run. */
  path: string;
  runner: RunnerKind;
  /** Extra CLI args passed through to the underlying runner. */
  extraArgs?: string[];
  /** Max time to allow the run, in milliseconds. */
  timeoutMs?: number;
}

export interface TestFailure {
  testName: string;
  message: string;
  category: FailureCategory;
}

export interface ExecuteTestsOutput {
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  exitCode: number;
  failures: TestFailure[];
  rawOutputTail: string;
}

export type FailureCategory =
  | "assertion"
  | "timeout"
  | "element-not-found"
  | "network"
  | "environment"
  | "unknown";

export interface AnalyzeFailureInput {
  /** Raw error/stack trace text from a failed test. */
  errorText: string;
  testName?: string;
}

export interface AnalyzeFailureOutput {
  category: FailureCategory;
  confidence: number;
  likelyCause: string;
  suggestedNextStep: string;
}

export interface DomCandidate {
  tag: string;
  text?: string;
  role?: string;
  attributes?: Record<string, string>;
  selector: string;
}

export interface HealLocatorInput {
  /** The selector that used to work and no longer matches anything. */
  brokenSelector: string;
  /** Optional: the visible text/intent the original selector was targeting. */
  intentText?: string;
  /** A flat list of current candidate elements from the live page/DOM snapshot. */
  candidates: DomCandidate[];
  /** How many ranked suggestions to return. */
  topN?: number;
}

export interface HealLocatorSuggestion {
  selector: string;
  score: number;
  reason: string;
}

export interface HealLocatorOutput {
  suggestions: HealLocatorSuggestion[];
}

export interface GenerateTestDataInput {
  /** JSON Schema (subset: type/properties/items/enum/format) describing one record. */
  schema: Record<string, unknown>;
  /** How many records to generate. */
  count?: number;
  /** Seed for reproducible generation. */
  seed?: number;
}

export interface GenerateTestDataOutput {
  records: Record<string, unknown>[];
}

export interface VisualDiffInput {
  baselinePath: string;
  candidatePath: string;
  /** 0-1, fraction of differing pixels allowed before flagging a regression. Default 0.01 (1%). */
  threshold?: number;
  /** Where to write the generated diff image. */
  diffOutputPath?: string;
}

export interface VisualDiffOutput {
  width: number;
  height: number;
  diffPixelCount: number;
  diffRatio: number;
  passed: boolean;
  diffImagePath?: string;
}
