import { byId } from "../bank";
import { flaggedQuestionIds, toggleFlag, persist } from "../store";
import { el, go, richStem, studyBlock } from "../ui";
import { statusLabel, type Question } from "../types";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderFlagged({ app }: RouteCtx): void {
  const list = flaggedQuestionIds()
    .map((id) => byId(id))
    .filter((q): q is Question => !!q);

  const items = list.map((q) =>
    el("div", { class: "review-item pending" }, [
      el("div", { class: "review-head" }, [
        el("span", { class: "q-no" }, [`第 ${q.originalNumber} 题`]),
        el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]),
        el("span", { class: "tag pending" }, ["标记不懂"]),
      ]),
      el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
      studyBlock(q),
      el("div", { class: "btn-row" }, [
        el("a", { class: "nav-btn", href: `#/practice/${q.originalNumber}` }, ["去复习"]),
        el(
          "button",
          {
            class: "nav-btn ghost",
            onClick: () => {
              toggleFlag(q.id);
              persist();
              go("#/flagged");
            },
          },
          ["取消标记"]
        ),
      ]),
    ])
  );

  app.replaceChildren(
    header("标记不懂汇总"),
    el("div", { class: "page" }, [
      el("div", { class: "muted small" }, [
        "做题时在结果区点“标记不懂”，这里汇总所有标记的题目。",
      ]),
      list.length === 0
        ? el("div", { class: "empty" }, ["还没有标记不懂的题目。"])
        : el("div", {}, items),
    ])
  );
}
