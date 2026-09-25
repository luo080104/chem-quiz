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
