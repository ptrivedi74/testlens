import { generateTests } from "./generateTests.js";
import { executeTests } from "./executeTests.js";
import { healLocator } from "./healLocator.js";
import { analyzeFailure } from "./analyzeFailure.js";
import { generateTestData } from "./generateTestData.js";
import { visualDiff } from "./visualDiff.js";
import type { ToolName } from "../schemas.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (input: any) => Promise<unknown>;

export const toolHandlers: Record<ToolName, ToolHandler> = {
  generate_tests: generateTests,
  execute_tests: executeTests,
  heal_locator: healLocator,
  analyze_failure: analyzeFailure,
  generate_test_data: generateTestData,
  visual_diff: visualDiff
};
