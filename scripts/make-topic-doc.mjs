#!/usr/bin/env node
// Generate a human-readable markdown list for each topic in the bank.
import { readFileSync, writeFileSync } from "node:fs";

const bank = JSON.parse(readFileSync("public/questions/chem-bank.json", "utf8").replace(/^\uFEFF/, ""));
const byId = Object.fromEntries(bank.questions.map((q) => [q.id, q]));

for (const t of bank.meta.topics || []) {
  let md = `# 论文相关题目清单：${t.title}\n\n`;
  md += `配合随笔《Following the Arrow》。从 ${bank.questions.length} 题中抽取 ${t.questionIds.length} 题，可在 App 首页“论文专题”里单独顺序练习（路径 #/topic/${t.id}）。\n\n`;
  md += `> ${t.intro}\n\n`;
  for (const g of t.groups || []) {
    md += `## ${g.name}\n\n`;
    for (const it of g.items || []) {
      const id = `CHEM-${it.ch}-${String(it.n).padStart(3, "0")}`;
      const q = byId[id];
      const label = `${it.ch.replace("1A", "1a").replace("1B", "1b")}-${it.n}`;
      md += `- **${label}** ${q ? q.stem : ""}\n`;
      md += `  - 关联：${it.note}\n`;
    }
    md += "\n";
  }
  const out = `docs/论文相关题目_${t.id}.md`;
  writeFileSync(out, md, "utf8");
  console.log(`written ${out} (${md.length} chars)`);
}
