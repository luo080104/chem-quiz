#!/usr/bin/env node
/**
 * Match official Q&A answers to parsed raw questions by STEM similarity
 * (order-independent), then emit an answer key keyed by the raw question number.
 *
 * Usage: node scripts/build-official-key.mjs <answers.txt> <raw.json> <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , ansFile, rawFile, outFile] = process.argv;

const STOP = new Set("a an the of is are was were in to and as by for or be it that this with on at from which what one following only not its into over".split(" "));
const toks = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w));
const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
};

// Parse official blocks.
const lines = readFileSync(ansFile, "utf8").replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
const blocks = [];
let stem = [];
let inOpts = false;
for (const raw of lines) {
  const line = raw.trim();
  if (/^Answer:/i.test(line)) {
    const rest = line.replace(/^Answer:\s*/i, "");
    const m = rest.match(/[A-E]/g) || [];
    blocks.push({ stem: stem.join(" "), answer: [...new Set(m)] });
    stem = [];
    inOpts = false;
    continue;
  }
  if (/^(Diff:|Var:|Page Ref:|LO:|GO:)/i.test(line)) continue;
  if (/^[A-E]\)\s/.test(line)) { inOpts = true; continue; }
  if (!line) continue;
  if (!inOpts) stem.push(line);
}

const raw = JSON.parse(readFileSync(rawFile, "utf8").replace(/^\uFEFF/, ""));
const rawToks = raw.questions.map((q) => toks(q.stem.replace(/\u0001/g, " ")));

// Global greedy assignment by descending similarity (avoid first-come misassign).
const blockToks = blocks.map((b) => toks(b.stem));
const pairs = [];
for (let qi = 0; qi < raw.questions.length; qi++) {
  for (let bi = 0; bi < blocks.length; bi++) {
    const score = jaccard(rawToks[qi], blockToks[bi]);
    if (score >= 0.5) pairs.push({ qi, bi, score });
  }
}
pairs.sort((a, b) => b.score - a.score);
const usedBlock = new Set();
const answers = {};
const matchedRaw = new Set();
for (const p of pairs) {
  if (usedBlock.has(p.bi) || matchedRaw.has(p.qi)) continue;
  usedBlock.add(p.bi);
  matchedRaw.add(p.qi);
  answers[String(raw.questions[p.qi].originalNumber)] = { answer: blocks[p.bi].answer };
}
let matched = matchedRaw.size;
const unmatchedRaw = raw.questions
  .map((q) => q.originalNumber)
  .filter((n) => !matchedRaw.has(n - 1));
for (const n of unmatchedRaw) console.log(`  unmatched raw #${n}: ${raw.questions[n - 1].stem.slice(0, 60)}`);

const out = {
  bankLabel: raw.label,
  author: "课程/老师官方 Q&A（按题干匹配到本题库）",
  createdAt: new Date().toISOString(),
  status: "approved",
  note: "从官方 Q&A 按题干相似度匹配得到；与题库题号一一对应。",
  matched,
  unmatchedRaw,
  answers,
};
writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8");
console.log(`${rawFile}: matched ${matched}/${raw.questions.length}, unmatched ${unmatchedRaw.length} -> ${outFile}`);
