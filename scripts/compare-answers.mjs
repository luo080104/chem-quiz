#!/usr/bin/env node
/**
 * Compare two answer sources question-by-question and produce an agreement /
 * conflict report. Two agreeing AI versions are NOT proof of correctness, so the
 * report is labelled as a "candidate comparison", not an audit.
 *
 * Accepts either an answer-key file ({ answers: { "1": { answer: [...] } } })
 * or a built bank file ({ questions: [{ originalNumber, answer, ... }] }).
 *
 * Usage:
 *   node scripts/compare-answers.mjs --a <A> --b <B> --out data/reports \
 *     [--labelA "本次AI"] [--labelB "手机DeepSeek"] [--bank public/questions/chem-bank.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const fileA = arg("a");
const fileB = arg("b");
const outDir = arg("out", "data/reports");
const labelA = arg("labelA", "A");
const labelB = arg("labelB", "B");
const bankFile = arg("bank", "");

if (!fileA || !fileB) {
  console.error("Usage: node scripts/compare-answers.mjs --a <A> --b <B> [--out dir]");
  process.exit(1);
}

function loadAnswers(file) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const map = new Map();
  if (data.questions) {
    for (const q of data.questions) map.set(Number(q.originalNumber), q.answer || []);
  } else if (data.answers) {
    for (const [k, v] of Object.entries(data.answers)) map.set(Number(k), v.answer || []);
  } else {
    throw new Error(`无法识别的答案文件结构: ${file}`);
  }
  return map;
}

const norm = (arr) => [...(arr || [])].map((x) => String(x).toUpperCase()).sort().join("");

const A = loadAnswers(fileA);
const B = loadAnswers(fileB);
const numbers = [...new Set([...A.keys(), ...B.keys()])].sort((x, y) => x - y);

const stemMap = new Map();
if (bankFile) {
  const bank = JSON.parse(readFileSync(bankFile, "utf8"));
  for (const q of bank.questions) stemMap.set(Number(q.originalNumber), q.stem || "");
}

const agree = [];
const disagree = [];
const onlyA = [];
const onlyB = [];
for (const n of numbers) {
  const hasA = A.has(n);
  const hasB = B.has(n);
  const a = A.get(n) || [];
  const b = B.get(n) || [];
  if (hasA && hasB) {
    if (norm(a) === norm(b)) agree.push({ n, a, b });
    else disagree.push({ n, a, b });
  } else if (hasA) onlyA.push({ n, a, b: [] });
  else onlyB.push({ n, a: [], b });
}

const report = {
  generatedAt: new Date().toISOString(),
  labelA,
  labelB,
  note: "两版答案一致不等于化学审核通过；有分歧的题请以老师/教材或独立复算为准。",
  counts: {
    totalCompared: numbers.length,
    agree: agree.length,
    disagree: disagree.length,
    onlyA: onlyA.length,
    onlyB: onlyB.length,
  },
  disagree,
  onlyA,
  onlyB,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "answer-compare.json"), JSON.stringify(report, null, 2), "utf8");

const line = (x) =>
  `  #${x.n}  ${labelA}=[${x.a.join(",") || "-"}]  ${labelB}=[${x.b.join(",") || "-"}]` +
  (stemMap.has(x.n) ? `  ${stemMap.get(x.n).slice(0, 60)}` : "");
const txt = [
  `答案对照报告  ${report.generatedAt}`,
  `A = ${labelA} (${fileA})`,
  `B = ${labelB} (${fileB})`,
  `比较题数 ${numbers.length}：一致 ${agree.length}，分歧 ${disagree.length}，仅A ${onlyA.length}，仅B ${onlyB.length}`,
  "",
  `分歧题 (${disagree.length}):`,
  ...disagree.map(line),
  "",
  `仅 A 有 (${onlyA.length}):`,
  ...onlyA.map(line),
  "",
  `仅 B 有 (${onlyB.length}):`,
  ...onlyB.map(line),
  "",
  "提醒：一致项仍需化学复核；分歧项不得擅自二选一。",
].join("\n");
writeFileSync(join(outDir, "answer-compare.txt"), txt, "utf8");

console.log(txt.split("\n").slice(0, 6).join("\n"));
console.log(`Report -> ${join(outDir, "answer-compare.json")}, ${join(outDir, "answer-compare.txt")}`);
