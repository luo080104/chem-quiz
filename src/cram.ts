import { getBank, byId } from "./bank";
import { state } from "./store";
import type { Question } from "./types";

export interface CramGroup {
  key: string;
  label: string;
  ids: string[];
}

export interface CramResult {
  groups: CramGroup[];
  ordered: Question[];
  total: number;
}

const SESSION_KEY = "chemquiz.cramIds";

function uniq(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Build the crash-review list from on-device records. */
export function buildCram(): CramResult {
  const bank = getBank();
  const s = state();
  const touched = s.practice.records;

  // 1) wrong questions from all submitted exams (most recent first)
  const simWrong: string[] = [];
  const exams = s.exams
    .filter((e) => e.submittedAt)
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  for (const e of exams) {
    for (const qid of e.questionIds) {
      const q = byId(qid);
      if (!q || !q.answer.length) continue;
      const chosen = e.answers[qid] || [];
      const ok = chosen.length === q.answer.length && chosen.every((k) => q.answer.includes(k));
      if (!ok) simWrong.push(qid);
    }
  }

  // 2) current wrongbook
  const wrong = Object.keys(s.wrongbook);

  // 3) active flagged
  const flagged = Object.values(touched)
    .filter((r) => r.flagged && !s.archivedFlagged.includes(r.questionId))
    .map((r) => r.questionId);

  // 4) never practiced / only once (from the full bank)
  const never: string[] = [];
  const once: string[] = [];
  for (const q of bank.questions) {
    const r = touched[q.id];
    if (!r || r.attempts === 0) never.push(q.id);
    else if (r.attempts === 1) once.push(q.id);
  }

  const groups: CramGroup[] = [
    { key: "sim", label: "模拟错题", ids: uniq(simWrong) },
    { key: "wrong", label: "当前错题本", ids: uniq(wrong) },
    { key: "flag", label: "标记不懂", ids: uniq(flagged) },
    { key: "never", label: "从没练过", ids: uniq(never) },
    { key: "once", label: "只练过 1 次", ids: uniq(once) },
  ];

  // priority: sim wrong > wrongbook > flagged > never > once, deduped
  const priority = uniq([
    ...groups[0].ids,
    ...groups[1].ids,
    ...groups[2].ids,
    ...groups[3].ids,
    ...groups[4].ids,
  ]);

  const ordered = priority
    .map((id) => byId(id))
    .filter((q): q is Question => !!q);

  return { groups, ordered, total: ordered.length };
}

/** Persist a fixed id order for the current drill session (stable while answering). */
export function saveCramSession(ids: string[]): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids));
}
export function loadCramSession(): string[] | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) && arr.length ? arr : null;
  } catch {
    return null;
  }
}
