import { buildCram, saveCramSession } from "../cram";
import { el, go, richStem } from "../ui";
import { statusLabel } from "../types";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderCram({ app }: RouteCtx): void {
  const cram = buildCram();
  const preview = cram.ordered.slice(0, 40);

  const groupCards = cram.groups.map((g) =>
    el("div", { class: "card" }, [
      el("div", { class: "card-label" }, [g.label]),
      el("div", { class: "card-value" }, [String(g.ids.length)]),
    ])
  );

  const items = preview.map((q) =>
    el("a", { class: "review-item", href: `#/practice/${q.originalNumber}`, style: "display:block;text-decoration:none;color:inherit;" }, [
      el("div", { class: "review-head" }, [
        el("span", { class: "q-no" }, [`第 ${q.originalNumber} 题`]),
        el("span", { class: "badge neutral" }, [String(q.label || "").replace("chapter", "Ch.")]),
        el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]),
      ]),
      el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
    ])
  );

  app.replaceChildren(
    header("突击练习"),
    el("div", { class: "page" }, [
      el("div", { class: "banner warn" }, [
        "按“模拟错题（错得越多越靠前）→ 错题未订正 → 标记不懂 → 从未答对”去重合并；只练过 1 次的不默认计入。清单在手机上实时生成。",
      ]),
      el("div", { class: "cards" }, groupCards),
      el("div", { class: "muted small" }, [
        "重点分布：" + cram.byChapter.map((c) => `${c.chapter} ${c.count}`).join(" · "),
      ]),
      el("div", { class: "muted small" }, [
        `只练过 1 次的有 ${cram.onceCount} 题（范围太大，默认不计入突击；需要的话我可以加“低练习量”专项）。`,
      ]),
      cram.total === 0
        ? el("div", { class: "empty" }, ["暂时没有需要突击的题，去模拟一次或刷几题吧。"])
        : el("button", {
            class: "primary-btn",
            onClick: () => {
              saveCramSession(cram.ordered.map((q) => q.id));
              go("#/drill/cram/0");
            },
          }, [`开始突击练习（${cram.total} 题）`]),
      el("h2", {}, [`清单预览（前 ${Math.min(40, cram.total)} / ${cram.total}）`]),
      ...items,
      cram.total > preview.length
        ? el("div", { class: "muted small" }, [`其余 ${cram.total - preview.length} 题在突击练习里继续。`])
        : el("div", { class: "muted small" }, ["共 " + cram.total + " 题。"]),
    ])
  );
}
