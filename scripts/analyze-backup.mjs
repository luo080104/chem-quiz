#!/usr/bin/env node
// Analyze a chem-quiz backup export against the built bank.
import { readFileSync, writeFileSync } from "node:fs";

const bankFile = process.argv[2] || "public/questions/chem-bank.json";
const backupFile = process.argv[3];
if (!backupFile) { console.error("Usage: node scripts/analyze-backup.mjs <bank.json> <backup.json>"); process.exit(1); }

const bank = JSON.parse(readFileSync(bankFile, "utf8").replace(/^\uFEFF/, ""));
const backup = JSON.parse(readFileSync(backupFile, "utf8").replace(/^\uFEFF/, ""));
const st = backup.state || backup;
const byId = Object.fromEntries(bank.questions.map((q) => [q.id, q]));
const rec = st.practice.records || {};
const wrongbook = st.wrongbook || {};
const exams = (st.exams || []).filter((e) => e.submittedAt);
const flagged = new Set(
  Object.values(rec).filter((r) => r.flagged && !(st.archivedFlagged || []).includes(r.questionId)).map((r) => r.questionId)
);

const setEq = (a, b) => a.length === b.length && a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

// wrong per exam + frequency
const simWrongCount = new Map();
const perExam = [];
for (const e of exams) {
  const wrong = [];
  for (const qid of e.questionIds) {
    const q = byId[qid];
    if (!q || !q.answer.length) continue;
    const chosen = e.answers[qid] || [];
    if (!setEq(chosen, q.answer)) {
      wrong.push(qid);
      simWrongCount.set(qid, (simWrongCount.get(qid) || 0) + 1);
    }
  }
  perExam.push({ id: e.id, score: e.correctCount, total: e.total, at: e.submittedAt, wrong });
}

// practice stats
const never = bank.questions.filter((q) => !rec[q.id] || rec[q.id].attempts === 0).map((q) => q.id);
const once = bank.questions.filter((q) => rec[q.id] && rec[q.id].attempts === 1).map((q) => q.id);
const neverCorrect = bank.questions
  .filter((q) => rec[q.id] && rec[q.id].attempts > 0 && rec[q.id].correctCount === 0)
  .map((q) => q.id);

// priority list
const reason = new Map();
function add(id, r, w) {
  if (!reason.has(id)) reason.set(id, { id, reasons: [], weight: 0 });
  const o = reason.get(id);
  if (!o.reasons.includes(r)) o.reasons.push(r);
  o.weight += w;
}
for (const [id, n] of [...simWrongCount.entries()].sort((a, b) => b[1] - a[1])) add(id, `模拟错 ${n} 次`, 100 + n * 10);
for (const id of Object.keys(wrongbook)) {
  const wb = wrongbook[id];
  add(id, wb.correctAfterWrong === 0 ? `错题本(未订正)` : `错题本(错过${wb.wrongCount}次)`, wb.correctAfterWrong === 0 ? 60 : 30);
}
for (const id of flagged) add(id, "标记不懂", 40);
for (const id of neverCorrect) add(id, "从未答对", 50);
for (const id of never) add(id, "从未练过", 35);
for (const id of once) add(id, "只练过1次", 10);

const ordered = [...reason.values()]
  .map((o) => ({ ...o, q: byId[o.id] }))
  .filter((o) => o.q)
  .sort((a, b) => b.weight - a.weight || a.q.originalNumber - b.q.originalNumber);

const tag = (qid) => {
  const q = byId[qid];
  return `${q.label.replace("chapter", "Ch.")}-${q.chapterNumber}`;
};

// chapter summary
const chapters = {};
for (const q of bank.questions) {
  const k = q.label.replace("chapter", "Ch.");
  if (!chapters[k]) chapters[k] = { total: 0, attempted: 0, attempts: 0, correct: 0, simWrong: 0 };
  const c = chapters[k];
  c.total++;
  const r = rec[q.id];
  if (r && r.attempts > 0) { c.attempted++; c.attempts += r.attempts; c.correct += r.correctCount; }
  c.simWrong += simWrongCount.get(q.id) || 0;
}

const lines = [];
lines.push(`备份时间: ${backup.exportedAt}`);
lines.push(`提交过的模拟: ${exams.length} 次`);
lines.push(`成绩: ${perExam.map((e) => `${e.score}/${e.total}`).join(", ")}`);
lines.push("");
lines.push("每章概况:");
for (const [k, c] of Object.entries(chapters)) {
  lines.push(`  ${k}: 练过 ${c.attempted}/${c.total} 题，正确率 ${c.attempts ? Math.round((c.correct / c.attempts) * 100) : 0}% (${c.correct}/${c.attempts})，模拟错 ${c.simWrong} 次`);
}
lines.push("");
lines.push(`从未练过: ${never.length} 题`);
lines.push(`只练过 1 次: ${once.length} 题`);
lines.push(`从未答对: ${neverCorrect.length} 题`);
lines.push(`模拟错过的不同题: ${simWrongCount.size} 题`);
lines.push(`标记不懂: ${flagged.size} 题`);
lines.push("");
lines.push(`突击清单（优先级排序，共 ${ordered.length} 题）:`);
ordered.forEach((o, i) => {
  lines.push(`${String(i + 1).padStart(3)}. ${tag(o.id)}  [${o.reasons.join(" / ")}]  ${o.q.stem.slice(0, 70)}`);
});

console.log(lines.join("\n"));
writeFileSync("data/reports/backup-analysis.txt", lines.join("\n"), "utf8");
writeFileSync("data/reports/backup-cram-ids.json", JSON.stringify(ordered.map((o) => o.id), null, 2), "utf8");
