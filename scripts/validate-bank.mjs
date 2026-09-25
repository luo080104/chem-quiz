#!/usr/bin/env node
/**
 * Structural validation for a structured question bank.
 * Writes a machine-readable report (JSON) and a human-readable list (TXT).
 *
 * Usage: node scripts/validate-bank.mjs <bank.json> [reportDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const bankFile = process.argv[2] || "public/questions/chem-bank.json";
const reportDir = process.argv[3] || "data/reports";

const bank = JSON.parse(readFileSync(bankFile, "utf8"));
const qs = bank.questions || [];

const errors = [];
const warnings = [];
const seenIds = new Set();
const seenNumbers = new Set();
const stems = new Map();
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

for (const q of qs) {
  if (seenIds.has(q.id)) errors.push(`重复ID: ${q.id}`);
  seenIds.add(q.id);
  if (seenNumbers.has(q.originalNumber))
    errors.push(`重复原题号: ${q.originalNumber} (${q.id})`);
  seenNumbers.add(q.originalNumber);

  if (!q.stem || !q.stem.trim()) errors.push(`题干为空: ${q.id}`);

  const optKeys = new Set((q.options || []).map((o) => o.key));
  if (!q.options || q.options.length < 2)
    errors.push(`选项少于2个: ${q.id}`);
  for (const a of q.answer || []) {
    if (!optKeys.has(a)) errors.push(`答案 ${a} 不属于已有选项: ${q.id}`);
  }
  if (q.type === "single" && (q.answer || []).length > 1)
    errors.push(`单选题却有多个答案: ${q.id}`);
  if ((q.answer || []).length === 0 && q.reviewStatus !== "pending-image")
    warnings.push(`无候选答案: ${q.id} (${q.reviewStatus})`);
  if (!q.explanation || !q.explanation.trim())
    warnings.push(`解析为空: ${q.id}`);
  for (const o of q.options || []) {
    if (!o.text || !o.text.trim()) errors.push(`选项文本为空: ${q.id}-${o.key}`);
    if (o.image) warnings.push(`含图片选项(待补图): ${q.id}-${o.key}`);
  }

  const n = norm(q.stem);
  if (stems.has(n)) warnings.push(`疑似重复题干: ${q.id} 与 ${stems.get(n)}`);
  stems.set(n, q.id);
}

// originalNumber should be a contiguous 1..N sequence for a single bank.
const nums = [...seenNumbers].sort((a, b) => a - b);
const maxN = nums.length ? nums[nums.length - 1] : 0;
const missing = [];
for (let i = 1; i <= maxN; i++) if (!seenNumbers.has(i)) missing.push(i);
if (missing.length) warnings.push(`缺题号: ${missing.join(",")}`);

const report = {
  bankFile,
  bankId: bank.meta?.bankId,
  version: bank.meta?.version,
  generatedAt: new Date().toISOString(),
  counts: {
    total: qs.length,
    ...(bank.meta?.counts || {}),
  },
  byStatus: qs.reduce((acc, q) => {
    acc[q.reviewStatus] = (acc[q.reviewStatus] || 0) + 1;
    return acc;
  }, {}),
  errors,
  warnings,
};

mkdirSync(reportDir, { recursive: true });
const jsonOut = join(reportDir, "validate-report.json");
const txtOut = join(reportDir, "validate-report.txt");
writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
const lines = [
  `题库校验报告  ${report.generatedAt}`,
  `题库: ${bankFile}`,
  `总数: ${report.counts.total}`,
  `状态分布: ${JSON.stringify(report.byStatus)}`,
  "",
  `错误 (${errors.length}):`,
  ...errors.map((e) => "  - " + e),
  "",
  `警告/待核 (${warnings.length}):`,
  ...warnings.map((w) => "  - " + w),
  "",
];
writeFileSync(txtOut, lines.join("\n"), "utf8");

console.log(`Validate: total=${qs.length} errors=${errors.length} warnings=${warnings.length}`);
console.log(`Report -> ${jsonOut}, ${txtOut}`);
if (errors.length) {
  console.error("ERRORS:");
  errors.forEach((e) => console.error("  - " + e));
  process.exitCode = 1;
}
