#!/usr/bin/env node
/**
 * Parse a normalized question text file into a raw question array.
 *
 * Expected format (one item per line, paragraph breaks preserved as \n):
 *   <stem line(s)>
 *   A) option
 *   B) option
 *   C) option
 *   D) option
 *   E) option
 *
 * Usage: node scripts/parse-questions.mjs <input.txt> <output.json> [label]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , input, output, label = "chapter1a"] = process.argv;
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
const IMG = /^\u0001+$/; // inline image placeholder emitted by Word text export
const questions = [];
let stem = [];
let options = [];
let current = null;
let pendingImageOption = null; // key awaiting its image content

function flush() {
  if (current && options.length >= 2) {
    questions.push({
      originalNumber: questions.length + 1,
      stem: stem.join(" ").replace(/\s+/g, " ").trim(),
      options: options.map((o) => ({ key: o.key, text: o.text })),
    });
  }
  stem = [];
  options = [];
  current = null;
  pendingImageOption = null;
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
      // Previous option was empty and had no image.
      options.push({ key: pendingImageOption, text: "" });
      pendingImageOption = null;
    }
    if (current === null) current = m[1];
    const text = m[2].trim();
    if (text === "") {
      pendingImageOption = m[1]; // resolved as image on the next line, or empty
    } else {
      options.push({ key: m[1], text });
    }
    continue;
  }
  // Non-option line: if we already collected options, this starts a new question.
  if (options.length > 0) {
    flush();
  }
  stem.push(line);
}
if (pendingImageOption !== null) {
  options.push({ key: pendingImageOption, text: "" });
  pendingImageOption = null;
}
flush();

const out = {
  label,
  sourceFile: input,
  parsedAt: new Date().toISOString(),
  count: questions.length,
  questions,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(out, null, 2), "utf8");
console.log(`Parsed ${questions.length} questions -> ${output}`);
if (questions.length > 0) {
  const optCounts = {};
  for (const q of questions) optCounts[q.options.length] = (optCounts[q.options.length] || 0) + 1;
  console.log("Option-count distribution:", optCounts);
}
