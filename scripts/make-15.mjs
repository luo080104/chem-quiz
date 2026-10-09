#!/usr/bin/env node
// Emit a formatted list of 15 selected paper-related questions.
import { readFileSync, writeFileSync } from "node:fs";

const bank = JSON.parse(readFileSync("public/questions/chem-bank.json", "utf8").replace(/^\uFEFF/, ""));
const byId = Object.fromEntries(bank.questions.map((q) => [q.id, q]));

const selected = [
  "CHEM-1A-052",
  "CHEM-1A-054",
  "CHEM-1A-056",
  "CHEM-1A-063",
  "CHEM-1A-064",
  "CHEM-1A-067",
  "CHEM-1A-068",
  "CHEM-1B-005",
  "CHEM-1B-008",
  "CHEM-1B-020",
  "CHEM-1B-021",
  "CHEM-1B-036",
  "CHEM-1B-037",
  "CHEM-1B-038",
  "CHEM-1B-040",
];

let md = "# 论文专题精选 15 题（Following the Arrow）\n\n";
selected.forEach((id, i) => {
  const q = byId[id];
  const label = id.replace("CHEM-1A-", "1a-").replace("CHEM-1B-", "1b-").replace(/-0*(\d+)$/, "-$1");
  md += `### ${i + 1}. [${label}] ${q.stem}\n\n`;
  for (const o of q.options) {
    md += `- ${o.key}) ${o.image ? "[图片选项]" : o.text}\n`;
  }
  md += `\n**答案：${q.answer.join(" ") || "（待核）"}**\n\n`;
  md += `**解析**：${q.explanation}\n\n`;
  if (q.stemZh) md += `**翻译**：${q.stemZh}\n\n`;
  if (q.glossary && q.glossary.length) {
    md += `**难词**：${q.glossary.map((g) => `${g.term}=${g.meaning}`).join("；")}\n\n`;
  }
});

writeFileSync("docs/论文专题精选15题.md", md, "utf8");
process.stdout.write(md);
