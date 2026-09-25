import { getBank } from "../bank";
import { el } from "../ui";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

interface Entry {
  term: string;
  meaning: string;
  note?: string;
  refs: string[];
}

// Very common / non-technical words hidden when "只看专业术语" is on.
const COMMON_WORDS = new Set(
  [
    "amount",
    "unit",
    "most",
    "difference",
    "set",
    "order",
    "define",
    "hold",
    "contain",
    "average",
    "maximum",
    "least",
    "at room temperature",
    "opposite sides",
    "similar",
    "correctly matched",
    "element name",
  ].map((s) => s.toLowerCase())
);

export function renderGlossary({ app }: RouteCtx): void {
  const bank = getBank();
  const map = new Map<string, Entry>();
  for (const q of bank.questions) {
    for (const g of q.glossary || []) {
      const k = g.term.trim().toLowerCase();
      if (!k) continue;
      if (!map.has(k)) map.set(k, { term: g.term, meaning: g.meaning, note: g.note, refs: [] });
      map.get(k)!.refs.push(`#${q.originalNumber}`);
    }
  }
  const entries = [...map.values()].sort((a, b) => a.term.localeCompare(b.term));
  const listBox = el("div", { class: "glossary-list" });
  const coreOnly = { on: false };

  function render(filter: string): void {
    const f = filter.trim().toLowerCase();
    const shown = entries.filter(
      (e) =>
        (!f || e.term.toLowerCase().includes(f) || e.meaning.includes(f)) &&
        (!coreOnly.on || !COMMON_WORDS.has(e.term.trim().toLowerCase()))
    );
    const nodes: HTMLElement[] = shown.map((e) =>
      el("div", { class: "gloss-item" }, [
        el("div", { class: "gloss-term" }, [e.term]),
        el("div", { class: "gloss-meaning" }, [e.note ? `${e.meaning}（${e.note}）` : e.meaning]),
        el("div", { class: "gloss-ref muted small" }, [`出现于 ${e.refs.join(", ")}`]),
      ])
    );
    if (nodes.length === 0) nodes.push(el("div", { class: "empty" }, ["没有匹配的术语"]));
    listBox.replaceChildren(...nodes);
  }

  const search = el("input", {
    class: "jump-input",
    type: "search",
    placeholder: "搜索术语 / 释义",
    style: "width:100%",
  }) as HTMLInputElement;
  search.addEventListener("input", () => render(search.value));

  const coreToggle = el("input", { type: "checkbox" }) as HTMLInputElement;
  coreToggle.addEventListener("change", () => {
    coreOnly.on = coreToggle.checked;
    render(search.value);
  });

  render("");
  app.replaceChildren(
    header("难词 / 术语表"),
    el("div", { class: "page" }, [
      el("div", { class: "muted small" }, [
        `共 ${entries.length} 个不重复术语，来自 ${bank.questions.length} 道题（已自动合并重复项）。`,
      ]),
      search,
      el("label", { class: "check-row" }, [coreToggle, el("span", {}, ["只看专业术语（隐藏常见词）"])]),
      listBox,
    ])
  );
}
