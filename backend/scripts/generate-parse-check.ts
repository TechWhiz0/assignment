import assert from "node:assert/strict";
import { questionRows, resolveRequirementIds } from "../src/pipeline/generate.ts";
import type { Requirement } from "../src/schema.ts";

const pool: Requirement[] = [
  { id: "r1", text: "Built infrastructure for fast-growing teams", kind: "technical", priority: "must" },
  { id: "r2", text: "Debugging distributed systems", kind: "technical", priority: "must" },
  { id: "r5", text: "Care about developer experience", kind: "behavioural", priority: "must" },
];

assert.deepEqual(questionRows({ questions: [{ prompt: "a" }] }).map((q) => q.prompt), ["a"]);
assert.deepEqual(questionRows([{ prompt: "b", question: "x" }]).map((q) => q.prompt), ["b"]);
assert.deepEqual(questionRows({ items: [{ text: "c" }] }).map((q) => q.text), ["c"]);
assert.deepEqual(questionRows(null), []);

assert.deepEqual(resolveRequirementIds(["r1", "r2"], pool, pool), ["r1", "r2"]);
assert.deepEqual(resolveRequirementIds(["R1", "req 2"], pool, pool), ["r1", "r2"]);
assert.deepEqual(resolveRequirementIds([], pool, [pool[0]!]), ["r1"]);
assert.deepEqual(
  resolveRequirementIds(["Built infrastructure for fast-growing teams"], pool, pool),
  ["r1"],
);

console.log("generate-parse-check ok");
