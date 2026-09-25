#!/usr/bin/env node
/**
 * Build the app-facing structured bank from one or more parsed sources.
 *
 * Config-driven (recommended):
 *   node scripts/build-bank.mjs --config data/import.config.json
 *
 * Legacy single-source flags are still accepted (--raw --answers --out ...).
 *
 * Each source contributes questions in order. A continuous `originalNumber`
 * (1..N) is assigned across all sources for app routing, while the source's own
 * number is kept as `chapterNumber` and the ID is chapter-scoped
 * (`CHEM-<idPrefix>-<chapterNumber>`) so different chapters never collide.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, basename } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const configFile = arg("config", "");
let config;
if (configFile) {
  config = JSON.parse(readFileSync(configFile, "utf8").replace(/^\uFEFF/, ""));
} else {
  config = {
    bankId: arg("bankId", "chem-250"),
    version: Number(arg("bankVersion", "1")),
    title: arg("title", "大学化学题库"),
    sources: [
      {
        label: arg("label", "bank"),
        chapter: arg("chapter", ""),
        idPrefix: arg("idPrefix", "1A"),
        raw: arg("raw", "data/raw/chapter1a.raw.json"),
        answers: arg("answers", "data/answer-keys/chapter1a.deepseek-independent.json"),
        imageManifest: arg("imageManifest", ""),
        imageBase: arg("imageBase", ""),
      },
    ],
  };
}

const outFile = config.out || arg("out", "public/questions/chem-bank.json");
const IMAGE_PLACEHOLDER = "[图片选项：原题为插图，待补图]";
const pad = (n, w = 3) => String(n).padStart(w, "0");

const questions = [];
let globalNumber = 0;

for (const src of config.sources) {
  const raw = JSON.parse(readFileSync(src.raw, "utf8").replace(/^\uFEFF/, ""));
  const key = src.answers && existsSync(src.answers)
    ? JSON.parse(readFileSync(src.answers, "utf8").replace(/^\uFEFF/, ""))
    : { answers: {} };

  // Optional study files (translation + glossary), merged by chapter number.
  const studyMap = {};
  const studyFiles = src.study ? (Array.isArray(src.study) ? src.study : [src.study]) : [];
  for (const f of studyFiles) {
    if (!existsSync(f)) continue;
    const s = JSON.parse(readFileSync(f, "utf8").replace(/^\uFEFF/, ""));
    Object.assign(studyMap, s.study || s);
  }

  let imageUrls = [];
  if (src.imageManifest && existsSync(src.imageManifest)) {
    const manifest = JSON.parse(readFileSync(src.imageManifest, "utf8").replace(/^\uFEFF/, ""));
    const base = src.imageBase || "";
    imageUrls = manifest.filter((m) => m.savedAs).map((m) => base + basename(m.savedAs));
  }
  let imageCursor = 0;
  const nextImage = () => (imageCursor < imageUrls.length ? imageUrls[imageCursor++] : null);

  for (const q of raw.questions) {
    globalNumber += 1;
    const chapterNumber = q.originalNumber;
    const k = key.answers[String(chapterNumber)] || {};
    const st = studyMap[String(chapterNumber)] || {};
    const answer = Array.isArray(k.answer) ? k.answer : [];
    const stemZh = st.stemZh || k.stemZh || "";
    const optionsZh = st.optionsZh || k.optionsZh || {};
    const glossary = Array.isArray(st.glossary) ? st.glossary : Array.isArray(k.glossary) ? k.glossary : [];

    const stemImages = [];
    let stem = q.stem || "";
    if (stem.includes("\u0001")) {
      const parts = stem.split("\u0001");
      for (let i = 0; i < parts.length - 1; i++) {
        const url = nextImage();
        if (url) stemImages.push(url);
      }
    }

    const options = q.options.map((o) =>
      o.text === "__IMAGE__" || o.image
        ? { key: o.key, text: "（图片选项）", image: true, imageUrl: nextImage() }
        : { key: o.key, text: o.text }
    );

    const hasImageOption = options.some((o) => o.image);
    const type = answer.length > 1 ? "multiple" : "single";
    let reviewStatus = "pending";
    if (hasImageOption && !options.every((o) => o.imageUrl)) reviewStatus = "pending-image";
    else if (k.flag === "contested") reviewStatus = "contested";
    else if (answer.length === 0) reviewStatus = "pending";
    if (k.status === "approved") reviewStatus = "approved";

    questions.push({
      id: `CHEM-${src.idPrefix}-${pad(chapterNumber)}`,
      version: config.version,
      originalNumber: globalNumber,
      chapterNumber,
      chapter: src.chapter || "",
      label: src.label,
      tags: [],
      type,
      stem,
      stemImages,
      stemZh,
      options,
      optionsZh,
      glossary,
      answer,
      explanation: k.explanation || "",
      candidateAnswer: answer,
      reviewStatus,
      reviewFlag: k.flag || null,
      source: { question: src.raw, answer: answer.length ? src.answers : null },
    });
  }
  console.log(`  source ${src.label}: ${raw.questions.length} questions, ${imageCursor}/${imageUrls.length} images`);
}

const meta = {
  bankId: config.bankId,
  version: config.version,
  title: config.title,
  generatedAt: new Date().toISOString(),
  sourceFiles: config.sources.map((s) => ({ label: s.label, raw: s.raw, answers: s.answers })),
  counts: {
    total: questions.length,
    approved: questions.filter((q) => q.reviewStatus === "approved").length,
    pending: questions.filter((q) => q.reviewStatus === "pending").length,
    pendingImage: questions.filter((q) => q.reviewStatus === "pending-image").length,
    contested: questions.filter((q) => q.reviewStatus === "contested").length,
    translated: questions.filter((q) => q.stemZh).length,
    glossaryTerms: questions.reduce((n, q) => n + q.glossary.length, 0),
  },
  disclaimer:
    "候选答案与翻译由本次AI独立给出，尚未与手机DeepSeek答案对照，也未经课程/教材审定。不得视为学校官方标准答案。",
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ meta, questions }, null, 2), "utf8");
console.log(`Built bank: ${questions.length} questions -> ${outFile}`);
console.log("counts:", meta.counts);
