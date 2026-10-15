import { byId } from "../bank";
import { flaggedQuestionIds, archivedFlaggedIds, removeFlag, unarchiveFlagged } from "../store";
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
  const archived = archivedFlaggedIds()
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
              removeFlag(q.id);
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
        "这里只显示当前标记不懂的题。取消后进“曾经不懂”，可随时用“还是不会”加回来。",
      ]),
      list.length === 0
        ? el("div", { class: "empty" }, ["还没有标记不懂的题目。"])
        : el("div", {}, [
            el("button", { class: "primary-btn", onClick: () => go("#/drill/flag/0") }, [
              `标记不懂回测（${list.length} 题）`,
            ]),
            ...items,
          ]),
      el("h2", {}, ["曾经不懂"]),
      archived.length === 0
        ? el("div", { class: "muted small" }, ["（无）"])
        : el(
            "div",
            {},
            archived.map((q) =>
              el("div", { class: "review-item pending" }, [
                el("div", { class: "review-head" }, [
                  el("span", { class: "q-no" }, [`第 ${q.originalNumber} 题`]),
                  el("span", { class: "tag pending" }, ["曾经不懂"]),
                ]),
                el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
                el("div", { class: "btn-row" }, [
                  el("a", { class: "nav-btn", href: `#/practice/${q.originalNumber}` }, ["重做"]),
                  el(
                    "button",
                    {
                      class: "nav-btn ghost",
                      onClick: () => {
                        unarchiveFlagged(q.id);
                        go("#/flagged");
                      },
                    },
                    ["还是不会"]
                  ),
                ]),
              ])
            )
          ),
    ])
  );
}
