import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFailure } from "../src/tools/analyzeFailure.js";
import { healLocator } from "../src/tools/healLocator.js";
import { generateTestData } from "../src/tools/generateTestData.js";

test("classifies timeout", () => {
  assert.equal(classifyFailure("Test timeout of 30000ms exceeded").category, "timeout");
});
test("heals locator by intent text", async () => {
  const r = await healLocator({ brokenSelector: "button#submit", intentText: "Submit order",
    candidates: [{ tag: "button", text: "Submit order", selector: "button.primary" }, { tag: "a", text: "Home", selector: "a.nav" }] });
  assert.equal(r.suggestions[0].selector, "button.primary");
});
test("seeded test data is reproducible", async () => {
  const schema = { type: "object", properties: { email: { type: "string", format: "email" } } };
  const a = await generateTestData({ schema, count: 2, seed: 7 });
  const b = await generateTestData({ schema, count: 2, seed: 7 });
  assert.deepEqual(a, b);
});
