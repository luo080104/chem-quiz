import { getBank } from "../bank";
import { el, richStem } from "../ui";
import { statusLabel, type Question } from "../types";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

function haystack(q: Question): string {
  const parts = [q.stem, q.stemZh || "", q.explanation || ""];
  for (const o of q.options) parts.push(o.text);
  for (const v of Object.values(q.optionsZh || {})) parts.push(v);
  for (const g of q.glossary || []) parts.push(g.term, g.meaning);
  return parts.join(" ").toLowerCase();
}

export function renderSearch({ app }: RouteCtx): void {
  const bank = getBank();
  const pool = bank.questions.map((q) => ({ q, text: haystack(q) }));
  const listBox = el("div", {});

  function render(raw: string): void {
    const query = raw.trim().toLowerCase();
    if (!query) {
      listBox.replaceChildren(el("div", { class: "muted small" }, ["输入关键词：题干、选项、解析、中文翻译、术语，或题号。"]));
      return;
    }
    const results = pool.filter(({ q, text }) => text.includes(query) || String(q.originalNumber) === query);
    const shown = results.slice(0, 60);
    const nodes: HTMLElement[] = shown.map(({ q }) =>
      el("a", { class: "review-item", href: `#/practice/${q.originalNumber}`, style: "display:block;text-decoration:none;color:inherit;" }, [
        el("div", { class: "review-head" }, [
          el("span", { class: "q-no" }, [`第 ${q.originalNumber} 题`]),
          el("span", { class: "badge neutral" }, [String(q.label || "").replace("chapter", "Ch.")]),
          el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]),
        ]),
        el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
      ])
    );
    if (nodes.length === 0) nodes.push(el("div", { class: "empty" }, ["没有找到匹配的题目。"]));
    listBox.replaceChildren(
      el("div", { class: "muted small" }, [
        `找到 ${results.length} 题${results.length > shown.length ? `（显示前 ${shown.length} 题）` : ""}`,
      ]),
      ...nodes
    );
  }

  const input = el("input", {
    class: "jump-input",
    type: "search",
    placeholder: "搜索题目 / 关键化学词",
    style: "width:100%",
    autofocus: true,
  }) as HTMLInputElement;
  input.addEventListener("input", () => render(input.value));

  render("");
  app.replaceChildren(header("搜索题目"), el("div", { class: "page" }, [input, listBox]));
}
