#!/usr/bin/env node
/**
 * Merge raw parsed questions + an independently produced answer key into the
 * app-facing structured bank.
 *
 * Usage:
 *   node scripts/build-bank.mjs \
 *     --raw data/raw/chapter1a.raw.json \
 *     --answers data/answer-keys/chapter1a.deepseek-independent.json \
 *     --out public/questions/chem-bank.json \
 *     --bankVersion 1
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const rawFile = arg("raw", "data/raw/chapter1a.raw.json");
const ansFile = arg("answers", "data/answer-keys/chapter1a.deepseek-independent.json");
const outFile = arg("out", "public/questions/chem-bank.json");
const bankVersion = Number(arg("bankVersion", "1"));
const bankId = arg("bankId", "chem-250");

const raw = JSON.parse(readFileSync(rawFile, "utf8"));
const key = JSON.parse(readFileSync(ansFile, "utf8"));

const IMAGE_PLACEHOLDER = "[图片选项：原题为插图，文本导出丢失，待补图]";

const questions = raw.questions.map((q) => {
  const k = key.answers[String(q.originalNumber)] || {};
  const answer = Array.isArray(k.answer) ? k.answer : [];
  const options = q.options.map((o) =>
    o.text === "__IMAGE__"
      ? { key: o.key, text: IMAGE_PLACEHOLDER, image: true }
      : { key: o.key, text: o.text }
  );
  const hasImageOption = options.some((o) => o.image);
  const type = answer.length > 1 ? "multiple" : "single";

  let reviewStatus = "pending";
  if (hasImageOption) reviewStatus = "pending-image";
  else if (k.flag === "contested") reviewStatus = "contested";
  else if (answer.length === 0) reviewStatus = "pending";

  return {
    id: `CHEM-${String(q.originalNumber).padStart(3, "0")}`,
    version: bankVersion,
    originalNumber: q.originalNumber,
    chapter: "Chapter 1: Introduction of Chemistry and Matter",
    tags: [],
    type,
    stem: q.stem,
    options,
    answer,
    explanation: k.explanation || "",
    candidateAnswer: answer,
    reviewStatus,
    reviewFlag: k.flag || null,
    source: {
      question: `${raw.sourceFile}`,
      answer: answer.length ? `${ansFile}` : null,
    },
  };
});

const meta = {
  bankId,
  version: bankVersion,
  label: raw.label,
  title: "大学化学题库（样机：Chapter 1a 真实题）",
  generatedAt: new Date().toISOString(),
  sourceFiles: {
    original: raw.sourceFile,
    answerKey: ansFile,
  },
  counts: {
    total: questions.length,
    approved: questions.filter((q) => q.reviewStatus === "approved").length,
    pending: questions.filter((q) => q.reviewStatus === "pending").length,
    pendingImage: questions.filter((q) => q.reviewStatus === "pending-image").length,
    contested: questions.filter((q) => q.reviewStatus === "contested").length,
  },
  disclaimer:
    "候选答案仅由本次AI独立给出，尚未与手机DeepSeek答案对照，也未经课程/教材审定。不得视为学校官方标准答案。",
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ meta, questions }, null, 2), "utf8");
console.log(`Built bank: ${questions.length} questions -> ${outFile}`);
console.log("counts:", meta.counts);
