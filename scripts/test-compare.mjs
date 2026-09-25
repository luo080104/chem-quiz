#!/usr/bin/env node
// Integration test for scripts/compare-answers.mjs using two small fixtures.
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "chemquiz-compare-"));
execFileSync(
  process.execPath,
  [
    "scripts/compare-answers.mjs",
    "--a", "data/tests/keyA.json",
    "--b", "data/tests/keyB.json",
    "--out", out,
    "--labelA", "A",
    "--labelB", "B",
  ],
  { stdio: "inherit" }
);

const report = JSON.parse(readFileSync(join(out, "answer-compare.json"), "utf8"));
const c = report.counts;
const expect = { totalCompared: 4, agree: 1, disagree: 1, onlyA: 1, onlyB: 1 };
const fail = [];
for (const [k, v] of Object.entries(expect)) if (c[k] !== v) fail.push(`${k}=${c[k]} expected ${v}`);
if (report.disagree[0].n !== 2) fail.push("disagree item should be #2");
if (fail.length) {
  console.error("COMPARE TEST FAILED:", fail.join("; "));
  process.exit(1);
}
console.log("PASS answer compare (agree/disagree/onlyA/onlyB)");
