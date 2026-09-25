export type ReviewStatus = "approved" | "pending" | "pending-image" | "contested";

export interface Option {
  key: string;
  text: string;
  image?: boolean;
  imageUrl?: string | null;
}

export interface GlossaryTerm {
  term: string;
  meaning: string;
  note?: string;
}

export interface Question {
  id: string;
  version: number;
  originalNumber: number;
  chapterNumber: number;
  label: string;
  chapter: string;
  tags: string[];
  type: "single" | "multiple";
  stem: string;
  stemImages?: string[];
  stemZh: string;
  options: Option[];
  optionsZh: Record<string, string>;
  glossary: GlossaryTerm[];
  answer: string[];
  explanation: string;
  candidateAnswer: string[];
  phoneAnswer: string[];
  reviewStatus: ReviewStatus;
  reviewFlag: string | null;
  source: { question: string; answer: string | null };
}

export interface BankMeta {
  bankId: string;
  version: number;
  label: string;
  title: string;
  generatedAt: string;
  sourceFiles: { original: string; answerKey: string };
  counts: {
    total: number;
    approved: number;
    pending: number;
    pendingImage: number;
    contested: number;
    translated?: number;
    glossaryTerms?: number;
    phoneCompared?: number;
    phoneDisagreements?: number;
  };
  disclaimer: string;
}

export interface Bank {
  meta: BankMeta;
  questions: Question[];
}

export function statusLabel(s: ReviewStatus): string {
  switch (s) {
    case "approved":
      return "已核";
    case "pending":
      return "答案待核";
    case "pending-image":
      return "缺图待核";
    case "contested":
      return "有争议";
  }
}
