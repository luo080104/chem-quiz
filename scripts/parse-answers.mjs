#!/usr/bin/env node
/**
 * Parse official Q&A text (questions with "Answer:  X" lines) into an
 * answer-key JSON keyed by the order of questions in the file.
 *
 * Usage:
 *   node scripts/parse-answers.mjs <answers.txt> <out.json> <label>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , input, output, label = "official"] = process.argv;
if (!input || !output) {
  console.error("Usage: node scripts/parse-answers.mjs <answers.txt> <out.json> <label>");
  process.exit(1);
}

const txt = readFileSync(input, "utf8").replace(/^\uFEFF/, "");
const re = /Answer:[ \t]*([^\r\n]*)/g;
const answers = {};
let m;
let n = 0;
while ((m = re.exec(txt)) !== null) {
  n += 1;
  const letters = [...new Set(m[1].match(/[A-E]/g) || [])];
  answers[String(n)] = { answer: letters };
}

const out = {
  bankLabel: label,
  author: "课程/老师官方 Q&A（权威来源）",
  createdAt: new Date().toISOString(),
  status: "approved",
  note: "从官方 Q&A 文件按题意顺序抽取的答案。",
  count: n,
  answers,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(out, null, 2), "utf8");
console.log(`Parsed ${n} official answers -> ${output}`);
