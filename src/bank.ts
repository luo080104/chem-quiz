import type { Bank, Question } from "./types";
import { switchBank } from "./store";

let bank: Bank | null = null;

export async function loadBank(): Promise<Bank> {
  if (bank) return bank;
  const url = `${import.meta.env.BASE_URL}questions/chem-bank.json`;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`题库加载失败: HTTP ${res.status}`);
  bank = (await res.json()) as Bank;
  return bank;
}

export function getBank(): Bank {
  if (!bank) throw new Error("题库尚未加载");
  return bank;
}

/** Bind history to the loaded bank; archives records if the bank id changed. */
export function bindBankVersion(): void {
  const b = getBank();
  switchBank(b.meta.bankId, b.meta.version);
}

export function questions(): Question[] {
  return getBank().questions;
}

export function byId(id: string): Question | undefined {
  return getBank().questions.find((q) => q.id === id);
}

export function byOriginalNumber(n: number): Question | undefined {
  return getBank().questions.find((q) => q.originalNumber === n);
}

export function scorableQuestions(): Question[] {
  return getBank().questions.filter((q) => q.answer.length > 0);
}
