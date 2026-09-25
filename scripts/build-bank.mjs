#!/usr/bin/env node
/**
 * Merge raw parsed questions + an answer key into the app-facing structured bank.
 *
 * Optionally maps inline image placeholders (U+0001) to real image URLs using a
 * manifest emitted by scripts/extract-docx.py. Placeholders are consumed in
 * document order: for each question, the stem first, then its options.
 *
 * Usage:
 *   node scripts/build-bank.mjs \
 *     --raw data/raw/chapter1a.docx.raw.json \
 *     --answers data/answer-keys/chapter1a.deepseek-independent.json \
 *     --out public/questions/chem-bank.json \
 *     --bankVersion 1 --bankId chem-sample-ch1a \
 *     [--imageManifest public/images/chapter1a/manifest.json] \
 *     [--imageBase images/chapter1a/]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, basename } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const rawFile = arg("raw", "data/raw/chapter1a.raw.json");
const ansFile = arg("answers", "data/answer-keys/chapter1a.deepseek-independent.json");
const outFile = arg("out", "public/questions/chem-bank.json");
const bankVersion = Number(arg("bankVersion", "1"));
const bankId = arg("bankId", "chem-sample-ch1a");
const imageManifest = arg("imageManifest", "");
const imageBase = arg("imageBase", "");

const raw = JSON.parse(readFileSync(rawFile, "utf8"));
const key = JSON.parse(readFileSync(ansFile, "utf8"));

let imageUrls = [];
if (imageManifest && existsSync(imageManifest)) {
  const manifest = JSON.parse(readFileSync(imageManifest, "utf8").replace(/^\uFEFF/, ""));
  imageUrls = manifest
    .filter((m) => m.savedAs)
    .map((m) => decodeURI(imageBase + basename(m.savedAs)));
}
let imageCursor = 0;
const nextImage = () => (imageCursor < imageUrls.length ? imageUrls[imageCursor++] : null);

const IMAGE_PLACEHOLDER = "[图片选项：原题为插图，待补图]";

const questions = raw.questions.map((q) => {
  const k = key.answers[String(q.originalNumber)] || {};
  const answer = Array.isArray(k.answer) ? k.answer : [];

  // Inline images inside the stem, in order.
  const stemImages = [];
  let stem = q.stem || "";
  if (stem.includes("\u0001")) {
    const parts = stem.split("\u0001");
    stem = parts.join("\u0001");
    for (let i = 0; i < parts.length - 1; i++) {
      const url = nextImage();
      if (url) stemImages.push(url);
    }
  }

  const options = q.options.map((o) => {
    if (o.text === "__IMAGE__" || o.image) {
      const url = nextImage();
      return { key: o.key, text: url ? "（图片选项）" : IMAGE_PLACEHOLDER, image: true, imageUrl: url };
    }
    return { key: o.key, text: o.text };
  });

  const hasImageOption = options.some((o) => o.image);
  const type = answer.length > 1 ? "multiple" : "single";
  let reviewStatus = "pending";
  if (hasImageOption && !options.every((o) => o.imageUrl)) reviewStatus = "pending-image";
  else if (k.flag === "contested") reviewStatus = "contested";
  else if (answer.length === 0) reviewStatus = "pending";

  return {
    id: `CHEM-${String(q.originalNumber).padStart(3, "0")}`,
    version: bankVersion,
    originalNumber: q.originalNumber,
    chapter: q.chapter || key.chapter || "",
    tags: [],
    type,
    stem,
    stemImages,
    options,
    answer,
    explanation: k.explanation || "",
    candidateAnswer: answer,
    reviewStatus,
    reviewFlag: k.flag || null,
    source: {
      question: raw.sourceFile,
      answer: answer.length ? ansFile : null,
    },
  };
});

const meta = {
  bankId,
  version: bankVersion,
  label: raw.label,
  title: "大学化学题库（样机：Chapter 1a 真实题）",
  generatedAt: new Date().toISOString(),
  sourceFiles: { original: raw.sourceFile, answerKey: ansFile, imageManifest: imageManifest || null },
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
console.log(`images mapped: ${imageCursor}/${imageUrls.length}`);
