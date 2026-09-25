// Bundled by scripts/test-logic.mjs and executed in Node with a localStorage shim.
import {
  mulberry32,
  sampleIds,
  emptyState,
  recordPracticeAnswer,
  practicedQuestionIds,
  wrongQuestionIds,
  state,
  persist,
  importBackup,
  exportBackup,
  switchBank,
} from "../src/store";
import { sameSet } from "../src/ui";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage;

const results: string[] = [];
function ok(msg: string): void {
  results.push("PASS " + msg);
}

// 1. PRNG determinism + no-replacement sampling
const pool = Array.from({ length: 100 }, (_, i) => `CHEM-${String(i + 1).padStart(3, "0")}`);
const s1 = sampleIds(pool, 100, 12345);
const s2 = sampleIds(pool, 100, 12345);
const s3 = sampleIds(pool, 100, 99999);
assert(s1.length === 100, "sample length 100");
assert(new Set(s1).size === 100, "no duplicates in sample");
assert(s1.every((id) => pool.includes(id)), "sample within pool");
assert(JSON.stringify(s1) === JSON.stringify(s2), "same seed => same paper");
assert(JSON.stringify(s1) !== JSON.stringify(s3), "different seed => different order");
ok("exam sampling: deterministic, no replacement, within pool");

// min(100, pool) when pool smaller
const small = sampleIds(pool.slice(0, 40), 100, 7);
assert(small.length === 40, "sampling caps at pool size");
ok("exam sampling caps at available pool");

// 2. sameSet scoring
assert(sameSet(["B"], ["B"]), "single correct");
assert(!sameSet(["A"], ["B"]), "single wrong");
assert(sameSet(["A", "C"], ["C", "A"]), "multiple order-insensitive");
assert(!sameSet(["A"], ["A", "C"]), "multiple partial is wrong");
ok("scoring: exact-set match");

// 3. practice history never erases old wrongs
mem.clear();
const st = emptyState();
assert(practicedQuestionIds().length === 0, "initial practiced 0");
recordPracticeAnswer("CHEM-005", ["A"], false);
assert(wrongQuestionIds().includes("CHEM-005"), "wrong enters wrongbook");
recordPracticeAnswer("CHEM-005", ["B"], true);
const wb = state().wrongbook["CHEM-005"];
assert(wb.wrongCount === 1, "old wrong count retained");
assert(wb.correctAfterWrong === 1, "later correct recorded separately");
assert(practicedQuestionIds().length === 1, "distinct practiced count = 1");
ok("wrongbook keeps history after later correct");
void st;

// 4. unscored (pending) answers do not enter wrongbook
recordPracticeAnswer("CHEM-063", ["A"], null);
assert(!wrongQuestionIds().includes("CHEM-063"), "pending answer not counted wrong");
recordPracticeAnswer("CHEM-063", [], null);
ok("unscored/pending answer not written to wrongbook");

// 5. export / import round-trip preserves history
const backup = exportBackup();
mem.clear();
state(); // force re-init from empty storage
const r = importBackup(backup);
assert(r.ok, "import ok");
assert(practicedQuestionIds().length >= 1, "history restored after import");
assert(wrongQuestionIds().includes("CHEM-005"), "wrongbook restored");
ok("export/import round-trip");

// 6. seed reproducibility of the actual random generator
const rngA = mulberry32(42);
const rngB = mulberry32(42);
assert(rngA() === rngB(), "mulberry32 deterministic");
ok("mulberry32 deterministic");

// 7. swapping bank id archives old records and resets the active bank
mem.clear();
state();
switchBank("chem-sample", 1);
recordPracticeAnswer("CHEM-001", ["A"], false);
const switched = switchBank("chem-250", 1);
assert(switched, "switchBank returns true when bank id changes");
assert(practicedQuestionIds().length === 0, "active records reset after bank switch");
assert(!!state().archivedBanks["chem-sample"], "old bank archived under its id");
assert(
  !!state().archivedBanks["chem-sample"].practice.records["CHEM-001"],
  "archived practice record kept"
);
ok("bank id change archives history without cross-bank ID collisions");

// 8. version bump within the SAME bank id keeps records
recordPracticeAnswer("CHEM-001", ["B"], true);
switchBank("chem-250", 2);
assert(practicedQuestionIds().length === 1, "same-bank version bump keeps records");
ok("same-bank version bump preserves records");
void persist;

console.log(results.join("\n"));
console.log("ALL LOGIC TESTS PASSED (" + results.length + ")");
