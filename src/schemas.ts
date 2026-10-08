/**
 * JSON-schema contracts for every TestLens MCP tool.
 * These are what calling agents (Claude Code, Cursor, etc.) see when they
 * list tools, so keep descriptions explicit — the agent decides whether and
 * how to call a tool based on these strings alone.
 */

const stepSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["goto", "click", "fill", "assertText", "assertVisible", "apiRequest"]
    },
    target: { type: "string", description: "CSS selector, role, or field name" },
    value: { type: "string", description: "Value to type, URL, or expected text" },
    method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
    expectStatus: { type: "number" }
  },
  required: ["action"]
};

export const toolDefinitions = [
  {
    name: "generate_tests",
    description:
      "Generate an executable test file (Playwright or pytest) from a plain-language list of steps. " +
      "Use this when you have a user flow, API contract, or acceptance criteria and need runnable test code, " +
      "not just a description of what to test.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short name for the test, used in the filename and test title" },
        runner: { type: "string", enum: ["playwright", "pytest"] },
        baseUrl: { type: "string", description: "Base URL of the app under test, for UI flows" },
        steps: { type: "array", items: stepSchema, minItems: 1 },
        outputDir: { type: "string", description: "Directory to write the generated file into, default 'generated'" }
      },
      required: ["name", "runner", "steps"]
    }
  },
  {
    name: "execute_tests",
    description:
      "Run an existing test file or directory with the given runner and return structured pass/fail results, " +
      "including a categorized list of failures. Use this after generate_tests, or on an existing suite, to get " +
      "machine-readable results rather than raw console output.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the test file or directory to run" },
        runner: { type: "string", enum: ["playwright", "pytest"] },
        extraArgs: { type: "array", items: { type: "string" } },
        timeoutMs: { type: "number", description: "Max time to allow the run, default 120000" }
      },
      required: ["path", "runner"]
    }
  },
  {
    name: "heal_locator",
    description:
      "Given a selector that no longer matches anything on the page, and a snapshot of current candidate " +
      "elements, rank the most likely replacements. Use this when a UI test fails specifically because an " +
      "element was not found, before concluding the feature itself is broken.",
    inputSchema: {
      type: "object",
      properties: {
        brokenSelector: { type: "string" },
        intentText: { type: "string", description: "The visible text or purpose the original selector targeted" },
        candidates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tag: { type: "string" },
              text: { type: "string" },
              role: { type: "string" },
              attributes: { type: "object" },
              selector: { type: "string", description: "A selector that would uniquely match this candidate" }
            },
            required: ["tag", "selector"]
          }
        },
        topN: { type: "number", description: "How many ranked suggestions to return, default 3" }
      },
      required: ["brokenSelector", "candidates"]
    }
  },
  {
    name: "analyze_failure",
    description:
      "Classify a test failure's raw error/stack trace into a category (assertion, timeout, element-not-found, " +
      "network, environment, unknown) and suggest the next diagnostic step. Use this to triage a failure before " +
      "deciding whether it's a real regression, a flaky test, or an environment issue.",
    inputSchema: {
      type: "object",
      properties: {
        errorText: { type: "string" },
        testName: { type: "string" }
      },
      required: ["errorText"]
    }
  },
  {
    name: "generate_test_data",
    description:
      "Generate synthetic records matching a given JSON Schema. Use this to create realistic test fixtures " +
      "(names, emails, dates, IDs) without hand-writing sample data or exposing real customer data.",
    inputSchema: {
      type: "object",
      properties: {
        schema: { type: "object", description: "JSON Schema describing one record" },
        count: { type: "number", description: "How many records to generate, default 5" },
        seed: { type: "number", description: "Seed for reproducible output" }
      },
      required: ["schema"]
    }
  },
  {
    name: "visual_diff",
    description:
      "Compare two screenshots pixel-by-pixel and report whether the difference exceeds a threshold, with a " +
      "generated diff image. Use this for visual regression checks after a UI change, as a complement to " +
      "functional assertions.",
    inputSchema: {
      type: "object",
      properties: {
        baselinePath: { type: "string" },
        candidatePath: { type: "string" },
        threshold: { type: "number", description: "Fraction of differing pixels allowed, default 0.01" },
        diffOutputPath: { type: "string" }
      },
      required: ["baselinePath", "candidatePath"]
    }
  }
] as const;

export type ToolName = (typeof toolDefinitions)[number]["name"];
