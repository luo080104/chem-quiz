/**
 * Local learning-record store. Everything lives in the phone's own browser
 * (localStorage). No account, no server. Clearing browser data erases it,
 * so the app provides export/import backups.
 */

export const STORAGE_KEY = "chemquiz.state.v1";
export const SCHEMA_VERSION = 1;

export interface QuestionRecord {
  questionId: string;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  lastAnswer: string[];
  lastCorrect: boolean | null; // null = not scored (answer not yet audited)
  lastPracticedAt: number;
  mastered: boolean;
  flagged?: boolean;
}

export interface WrongbookEntry {
  questionId: string;
  firstWrongAt: number;
  lastWrongAt: number;
  wrongCount: number;
  correctAfterWrong: number;
  mastered: boolean;
}

export interface ExamRecord {
  id: string;
  seed: number;
  bankVersion: number;
  bankId: string;
  questionIds: string[];
  startedAt: number;
  submittedAt: number | null;
  elapsedMs: number;
  lastTickAt: number;
  answers: Record<string, string[]>;
  correctCount: number | null;
  total: number;
  cursor: number;
}

export interface ArchivedBank {
  bankId: string;
  bankVersion: number | null;
  archivedAt: number;
  practice: AppState["practice"];
  wrongbook: Record<string, WrongbookEntry>;
}

export interface AppState {
  schema: number;
  bankId: string | null;
  bankVersion: number | null;
  practice: {
    lastIndex: number;
    lastQuestionId: string | null;
    updatedAt: number;
    records: Record<string, QuestionRecord>;
  };
  wrongbook: Record<string, WrongbookEntry>;
  exams: ExamRecord[];
  activeExamId: string | null;
  archivedBanks: Record<string, ArchivedBank>;
}

export function emptyState(): AppState {
  return {
    schema: SCHEMA_VERSION,
    bankId: null,
    bankVersion: null,
    practice: { lastIndex: 0, lastQuestionId: null, updatedAt: 0, records: {} },
    wrongbook: {},
    exams: [],
    activeExamId: null,
    archivedBanks: {},
  };
}

/**
 * Bind the app to a bank. If the bank id changed, archive the previous bank's
 * practice/wrongbook under its own id (so IDs from a different bank never get
 * mis-matched) and start a fresh active bank. A version bump within the SAME
 * bank id keeps records (IDs are stable across revisions).
 */
export function switchBank(bankId: string, bankVersion: number): boolean {
  const s = state();
  if (s.bankId === bankId) {
    s.bankVersion = bankVersion;
    persist();
    return false;
  }
  const hasData =
    Object.keys(s.practice.records).length > 0 || Object.keys(s.wrongbook).length > 0;
  if (s.bankId && hasData) {
    s.archivedBanks[s.bankId] = {
      bankId: s.bankId,
      bankVersion: s.bankVersion,
      archivedAt: nowMs(),
      practice: s.practice,
      wrongbook: s.wrongbook,
    };
  }
  s.bankId = bankId;
  s.bankVersion = bankVersion;
  s.practice = emptyState().practice;
  s.wrongbook = {};
  s.activeExamId = null;
  persist();
  return true;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    // shallow merge to tolerate older/partial states
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      practice: { ...base.practice, ...(parsed.practice || {}) },
      wrongbook: parsed.wrongbook || {},
      exams: parsed.exams || [],
      archivedBanks: parsed.archivedBanks || {},
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState): void {
  state.schema = SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let cache: AppState | null = null;
export function state(): AppState {
  if (!cache) cache = loadState();
  return cache;
}
export function persist(): void {
  if (cache) saveState(cache);
}
export function reloadState(): AppState {
  cache = loadState();
  return cache;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Deterministic PRNG (mulberry32) so a saved seed reproduces the same paper. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample n ids without replacement, deterministically from seed. */
export function sampleIds(ids: string[], n: number, seed: number): string[] {
  const pool = ids.slice();
  const rand = mulberry32(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

export function nowMs(): number {
  return Date.now();
}

export function ensureRecord(questionId: string): QuestionRecord {
  const s = state();
  if (!s.practice.records[questionId]) {
    s.practice.records[questionId] = {
      questionId,
      attempts: 0,
      correctCount: 0,
      wrongCount: 0,
      lastAnswer: [],
      lastCorrect: null,
      lastPracticedAt: 0,
      mastered: false,
    };
  }
  return s.practice.records[questionId];
}

/**
 * Record a practice answer. Historical wrongs are never erased: a later
 * correct answer only increments correctAfterWrong / may set mastered.
 */
export function recordPracticeAnswer(
  questionId: string,
  chosen: string[],
  correct: boolean | null
): void {
  const s = state();
  const r = ensureRecord(questionId);
  r.attempts += 1;
  r.lastAnswer = chosen.slice();
  r.lastCorrect = correct;
  r.lastPracticedAt = nowMs();
  if (correct === true) {
    r.correctCount += 1;
    if (s.wrongbook[questionId]) {
      s.wrongbook[questionId].correctAfterWrong += 1;
    }
  } else if (correct === false) {
    r.wrongCount += 1;
    const wb = s.wrongbook[questionId];
    if (wb) {
      wb.lastWrongAt = nowMs();
      wb.wrongCount += 1;
    } else {
      s.wrongbook[questionId] = {
        questionId,
        firstWrongAt: nowMs(),
        lastWrongAt: nowMs(),
        wrongCount: 1,
        correctAfterWrong: 0,
        mastered: false,
      };
    }
  }
  persist();
}

/** Practiced = at least one submitted attempt on that distinct question. */
export function practicedQuestionIds(): string[] {
  return Object.values(state().practice.records)
    .filter((r) => r.attempts > 0)
    .map((r) => r.questionId);
}

export function wrongQuestionIds(): string[] {
  return Object.keys(state().wrongbook);
}

export function toggleFlag(questionId: string): boolean {
  const r = ensureRecord(questionId);
  r.flagged = !r.flagged;
  persist();
  return !!r.flagged;
}

export function isFlagged(questionId: string): boolean {
  return !!state().practice.records[questionId]?.flagged;
}

export function flaggedQuestionIds(): string[] {
  return Object.values(state().practice.records)
    .filter((r) => r.flagged)
    .map((r) => r.questionId);
}

export function exportBackup(): string {
  const s = state();
  return JSON.stringify(
    {
      app: "chem-quiz",
      exportedAt: new Date().toISOString(),
      bankId: s.bankId,
      bankVersion: s.bankVersion,
      state: s,
    },
    null,
    2
  );
}

export interface ImportResult {
  ok: boolean;
  message: string;
}

export function importBackup(text: string): ImportResult {
  try {
    const data = JSON.parse(text);
    const incoming: AppState | undefined = data.state || data;
    if (!incoming || typeof incoming !== "object" || !incoming.practice) {
      return { ok: false, message: "文件格式无法识别（缺少 practice 字段）" };
    }
    cache = {
      ...emptyState(),
      ...incoming,
      practice: { ...emptyState().practice, ...(incoming.practice || {}) },
      wrongbook: incoming.wrongbook || {},
      exams: incoming.exams || [],
      archivedBanks: incoming.archivedBanks || {},
    };
    persist();
    return { ok: true, message: "导入成功，学习记录已恢复" };
  } catch (e) {
    return { ok: false, message: "导入失败：不是有效的 JSON 备份文件" };
  }
}

export function clearLearningData(): void {
  const s = emptyState();
  cache = s;
  saveState(s);
}
