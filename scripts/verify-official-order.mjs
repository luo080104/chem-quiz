#!/usr/bin/env node
// Verify that an official Q&A text file lists questions in the same order as a
// parsed raw bank, by comparing normalized stems positionally.
import { readFileSync } from "node:fs";

const pairs = [
  ["data/source/answers/answers_1a.txt", "data/raw/chapter1a.raw.json"],
  ["data/source/answers/answers_1b.txt", "data/raw/chapter1b.raw.json"],
  ["data/source/answers/answers_2.txt", "data/raw/chapter1c.raw.json"],
];

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

for (const [ansFile, rawFile] of pairs) {
  const lines = readFileSync(ansFile, "utf8").replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
  const officialStems = [];
  let stem = [];
  let inOpts = false;
  const META = /^(Diff:|Var:|Page Ref:|LO:|GO:|Answer:)/i;
  for (const raw of lines) {
    const line = raw.trim();
    if (META.test(line)) {
      if (/^Answer:/i.test(line)) {
        officialStems.push(stem.join(" "));
        stem = [];
        inOpts = false;
      }
      continue;
    }
    if (/^[A-E]\)\s/.test(line)) {
      inOpts = true;
      continue;
    }
    if (!line) continue;
    if (!inOpts) stem.push(line);
  }
  const raw = JSON.parse(readFileSync(rawFile, "utf8").replace(/^\uFEFF/, ""));
  const n = Math.min(officialStems.length, raw.questions.length);
  let mismatches = 0;
  for (let i = 0; i < n; i++) {
    if (norm(officialStems[i]) !== norm(raw.questions[i].stem)) {
      mismatches++;
      if (mismatches <= 5) {
        console.log(`  [${rawFile} #${i + 1}] ORDER MISMATCH`);
        console.log(`     official: ${officialStems[i].slice(0, 70)}`);
        console.log(`     mine    : ${raw.questions[i].stem.slice(0, 70)}`);
      }
    }
  }
  console.log(
    `${rawFile}: official=${officialStems.length} mine=${raw.questions.length} mismatches=${mismatches}`
  );
}
