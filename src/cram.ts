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
  onceCount: number;
  byChapter: Array<{ chapter: string; count: number }>;
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

const setEq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

/**
 * Focused crash-review list from on-device records:
 *   sim wrong (by frequency) > wrongbook (not yet corrected) > flagged > never correct.
 * "Only practiced once" is reported separately and NOT included (too broad).
 */
export function buildCram(): CramResult {
  const bank = getBank();
  const s = state();
  const touched = s.practice.records;

  const simCount = new Map<string, number>();
  const exams = s.exams
    .filter((e) => e.submittedAt)
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  for (const e of exams) {
    for (const qid of e.questionIds) {
      const q = byId(qid);
      if (!q || !q.answer.length) continue;
      const chosen = e.answers[qid] || [];
      if (!setEq(chosen, q.answer)) simCount.set(qid, (simCount.get(qid) || 0) + 1);
    }
  }

  const notFixed = Object.keys(s.wrongbook).filter((id) => s.wrongbook[id].correctAfterWrong === 0);
  const flagged = Object.values(touched)
    .filter((r) => r.flagged && !s.archivedFlagged.includes(r.questionId))
    .map((r) => r.questionId);
  const neverCorrect = bank.questions
    .filter((q) => touched[q.id] && touched[q.id].attempts > 0 && touched[q.id].correctCount === 0)
    .map((q) => q.id);
  const once = bank.questions
    .filter((q) => touched[q.id] && touched[q.id].attempts === 1)
    .map((q) => q.id);

  const sim = [...simCount.keys()];
  const groups: CramGroup[] = [
    { key: "sim", label: "模拟错题", ids: uniq(sim) },
    { key: "notfixed", label: "错题(未订正)", ids: uniq(notFixed) },
    { key: "flag", label: "标记不懂", ids: uniq(flagged) },
    { key: "never", label: "从未答对", ids: uniq(neverCorrect) },
  ];

  const core = uniq([...groups[0].ids, ...groups[1].ids, ...groups[2].ids, ...groups[3].ids]);
  const score = (id: string): number => {
    let w = 0;
    if (simCount.has(id)) w += 100 + simCount.get(id)! * 10;
    if (notFixed.includes(id)) w += 50;
    if (neverCorrect.includes(id)) w += 40;
    if (flagged.includes(id)) w += 30;
    return w;
  };
  const ordered = core
    .map((id) => byId(id))
    .filter((q): q is Question => !!q)
    .sort((a, b) => score(b.id) - score(a.id) || a.originalNumber - b.originalNumber);

  const chMap = new Map<string, number>();
  for (const q of ordered) {
    const k = String(q.label || "").replace("chapter", "Ch.");
    chMap.set(k, (chMap.get(k) || 0) + 1);
  }
  const byChapter = [...chMap.entries()]
    .map(([chapter, count]) => ({ chapter, count }))
    .sort((a, b) => b.count - a.count);

  return { groups, ordered, total: ordered.length, onceCount: once.length, byChapter };
}

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
