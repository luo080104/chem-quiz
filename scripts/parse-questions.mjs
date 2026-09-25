#!/usr/bin/env node
/**
 * Parse a normalized question text file into a raw question array.
 *
 * Expected format (one item per line, paragraph breaks preserved as \n):
 *   [optional question number line, e.g. "12." or "第12题"]
 *   <stem line(s)>
 *   A) option
 *   B) option
 *   C) option
 *   D) option
 *   E) option
 *
 * Original numbers are preserved when present (a leading "12." / "12、" / "12)"
 * or a standalone number line / "第12题"), otherwise sequential numbering is used.
 * Inline images exported as U+0001 are kept and flagged.
 *
 * Usage:
 *   node scripts/parse-questions.mjs <input.txt> <output.json> [label]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const input = process.argv[2];
const output = process.argv[3];
const label = process.argv[4] || "bank";
if (!input || !output) {
  console.error("Usage: node scripts/parse-questions.mjs <input.txt> <output.json> [label]");
  process.exit(1);
}

const raw = readFileSync(input, "utf8").replace(/^\uFEFF/, "");
const lines = raw
  .replace(/\r\n?/g, "\n")
  .replace(/\v/g, "\n")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

// Drop a leading document title line (e.g. "Chapter 1 ...") so it does not
// get glued onto question 1. A real stem contains a blank marker or question mark.
if (lines.length && /^chapter\b/i.test(lines[0]) && !/[?_]/.test(lines[0])) {
  lines.shift();
}

const OPT = /^([A-Z])\)\s*(.*)$/;
const IMG = /^\u0001+$/;
const STANDALONE_NUM = /^(?:第\s*)?(\d{1,4})\s*(?:题|[.、)．。]?)$/;
const LEADING_NUM = /^(?:第\s*)?(\d{1,4})\s*[.、)．]\s*(.+)$/;

const questions = [];
let stem = [];
let options = [];
let current = null;
let pendingImageOption = null;
let pendingNumber = null;

function flush() {
  if (current && options.length >= 2) {
    const stemText = stem.join(" ").replace(/\s+/g, " ").trim();
    let number = pendingNumber;
    let cleanStem = stemText;
    const m = stemText.match(LEADING_NUM);
    if (number === null && m) {
      number = Number(m[1]);
      cleanStem = m[2].trim();
    }
    questions.push({
      originalNumber: number, // may be null -> assigned sequentially below
      stem: cleanStem,
      options: options.map((o) => ({ key: o.key, text: o.text, ...(o.image ? { image: true } : {}) })),
    });
  }
  stem = [];
  options = [];
  current = null;
  pendingImageOption = null;
  pendingNumber = null;
}

for (const line of lines) {
  // Image content for a just-seen empty option like "A)".
  if (pendingImageOption !== null && IMG.test(line)) {
    options.push({ key: pendingImageOption, text: "__IMAGE__", image: true });
    pendingImageOption = null;
    continue;
  }
  const m = line.match(OPT);
  if (m) {
    if (pendingImageOption !== null) {
      options.push({ key: pendingImageOption, text: "" });
      pendingImageOption = null;
    }
    if (current === null) current = m[1];
    const text = m[2].trim();
    if (text === "") pendingImageOption = m[1];
    else options.push({ key: m[1], text });
    continue;
  }
  // A standalone number line before the stem starts a new question number.
  if (options.length === 0 && stem.length === 0) {
    const nm = line.match(STANDALONE_NUM);
    if (nm && !line.includes("__") && line.replace(/[^0-9]/g, "") === nm[1]) {
      pendingNumber = Number(nm[1]);
      continue;
    }
  }
  if (options.length > 0) flush();
  stem.push(line);
}
if (pendingImageOption !== null) {
  options.push({ key: pendingImageOption, text: "" });
  pendingImageOption = null;
}
flush();

const explicitCount = questions.filter((q) => q.originalNumber != null).length;

// Fill in sequential numbers for any question lacking a detected number.
let seq = 0;
for (const q of questions) {
  if (q.originalNumber == null || Number.isNaN(q.originalNumber)) {
    seq += 1;
    q.originalNumber = seq;
  } else {
    seq = q.originalNumber;
  }
}

const out = {
  label,
  sourceFile: input,
  parsedAt: new Date().toISOString(),
  count: questions.length,
  numbered: explicitCount > 0,
  explicitNumberCount: explicitCount,
  questions,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(out, null, 2), "utf8");
console.log(`Parsed ${questions.length} questions -> ${output} (explicit numbers: ${explicitCount})`);
const optCounts = {};
for (const q of questions) optCounts[q.options.length] = (optCounts[q.options.length] || 0) + 1;
console.log("Option-count distribution:", optCounts);
const nums = questions.map((q) => q.originalNumber).sort((a, b) => a - b);
console.log(`Number range: ${nums[0]}..${nums[nums.length - 1]}`);
