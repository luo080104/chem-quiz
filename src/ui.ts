import { escapeHtml, formatChem } from "./render";

type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | number | EventListener | undefined> = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === "html") {
      node.innerHTML = String(v);
    } else if (v === true) {
      node.setAttribute(k, "");
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

/** Render chemistry-aware text (returns a span with safe innerHTML). */
export function rich(text: string, className?: string): HTMLSpanElement {
  return el("span", { class: className ?? "", html: formatChem(text ?? "") });
}

export function richBlock(text: string, className?: string): HTMLElement {
  return el("div", { class: className ?? "", html: formatChem(text ?? "") });
}

/**
 * Render a stem that may contain inline image placeholders (U+0001).
 * Images are interleaved in order; a missing image shows a visible hint.
 */
export function richStem(text: string, images?: (string | null)[]): HTMLElement {
  const wrap = el("div", { class: "stem-body" });
  const parts = String(text ?? "").split("\u0001");
  parts.forEach((seg, i) => {
    if (seg) wrap.append(el("span", { html: formatChem(seg) }));
    if (i < parts.length - 1) {
      const url = images?.[i];
      if (url) wrap.append(el("img", { class: "inline-img", src: url, alt: "公式或图片" }));
      else wrap.append(el("span", { class: "opt-image" }, ["[图片缺失]"]));
    }
  });
  return wrap;
}

/**
 * Collapsible "中文翻译 / 难词注释" block for the answer & explanation area.
 * Returns null when the question has neither translation nor glossary.
 */
export function studyBlock(q: {
  stemZh?: string;
  optionsZh?: Record<string, string>;
  glossary?: { term: string; meaning: string; note?: string }[];
  options?: { key: string; text: string }[];
}): HTMLElement | null {
  const zh = (q.stemZh || "").trim();
  const optsZh = q.optionsZh || {};
  const glossary = q.glossary || [];
  if (!zh && Object.keys(optsZh).length === 0 && glossary.length === 0) return null;

  const body = el("div", { class: "study-body" });
  if (zh) body.append(el("div", { class: "zh-stem" }, [el("span", { class: "muted" }, ["题干翻译："]), zh]));
  const optEntries = Object.entries(optsZh);
  if (optEntries.length) {
    body.append(
      el("ul", { class: "zh-options" }, optEntries.map(([k, v]) => el("li", {}, [`${k}. ${v}`])))
    );
  }
  if (glossary.length) {
    body.append(
      el("div", { class: "glossary-title"}, ["难词 / 术语："]),
      el(
        "dl",
        { class: "glossary" },
        glossary.flatMap((g) => [
          el("dt", {}, [g.term]),
          el("dd", {}, [g.note ? `${g.meaning}（${g.note}）` : g.meaning]),
        ])
      )
    );
  }
  return el("details", { class: "study" }, [el("summary", {}, ["中文翻译 / 难词注释"]), body]);
}

export function optionContent(opt: { text: string; image?: boolean; imageUrl?: string | null }): HTMLElement {
  if (opt.imageUrl) {
    return el("span", { class: "opt-text opt-imagebox" }, [
      el("img", { class: "opt-img", src: opt.imageUrl, alt: opt.text || "图片选项" }),
    ]);
  }
  return rich(opt.text, "opt-text");
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

export function go(hash: string): void {
  location.hash = hash;
}

export function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)));
}

export function fmtDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((x, i) => x === sb[i]);
}

export { escapeHtml };
