import { state, activeWrongIds, archivedWrongIds, archiveWrong, unarchiveWrong } from "../store";
import { byId } from "../bank";
import { el, go, richStem, studyBlock, fmtDateTime } from "../ui";
import { statusLabel } from "../types";
import type { RouteCtx } from "../main";
import type { Question } from "../types";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderWrongbook({ app }: RouteCtx): void {
  const s = state();
  const active = activeWrongIds()
    .map((id) => s.wrongbook[id])
    .filter(Boolean)
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt);
  const archived = archivedWrongIds()
    .map((id) => byId(id))
    .filter((q): q is Question => !!q);

  const items = active.map((w) => {
    const q = byId(w.questionId) as Question | undefined;
    const no = q ? `第 ${q.originalNumber} 题` : w.questionId;
    return el("div", { class: "review-item bad" }, [
      el("div", { class: "review-head" }, [
        el("span", { class: "q-no" }, [no]),
        q ? el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]) : null,
        el("span", { class: "tag bad" }, [`错 ${w.wrongCount} 次`]),
        w.correctAfterWrong > 0 ? el("span", { class: "tag ok" }, [`答对过 ${w.correctAfterWrong} 次`]) : null,
      ]),
      q
        ? el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)])
        : el("div", { class: "muted" }, ["（题库中找不到该题）"]),
      el("div", { class: "muted small" }, [
        `首次答错 ${fmtDateTime(w.firstWrongAt)} · 最近答错 ${fmtDateTime(w.lastWrongAt)}`,
      ]),
      q ? studyBlock(q) : null,
      el("div", { class: "btn-row" }, [
        el("a", { class: "nav-btn", href: `#/practice/${q ? q.originalNumber : 1}` }, ["重新练习"]),
        el(
          "button",
          {
            class: "nav-btn ghost",
            onClick: () => {
              archiveWrong(w.questionId);
              go("#/wrongbook");
            },
          },
          ["移出错题（已掌握）"]
        ),
      ]),
    ]);
  });

  app.replaceChildren(
    header("错题复习"),
    el("div", { class: "page" }, [
      el("div", { class: "muted small" }, [
        "这里只显示当前错题。移出的题会进“曾经错过”，可随时用“还是不会”加回来。",
      ]),
      active.length === 0
        ? el("div", { class: "empty" }, ["暂无错题。先去顺序刷题或模拟考吧。"])
        : el("div", {}, [
            el("button", { class: "primary-btn", onClick: () => go("#/drill/wrong/0") }, [
              `错题回测（${active.length} 题）`,
            ]),
            ...items,
          ]),
      el("h2", {}, ["曾经错过"]),
      archived.length === 0
        ? el("div", { class: "muted small" }, ["（无）"])
        : el(
            "div",
            {},
            archived.map((q) =>
              el("div", { class: "review-item pending" }, [
                el("div", { class: "review-head" }, [
                  el("span", { class: "q-no" }, [`第 ${q.originalNumber} 题`]),
                  el("span", { class: "tag pending" }, ["曾经错过"]),
                ]),
                el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
                el("div", { class: "btn-row" }, [
                  el("a", { class: "nav-btn", href: `#/practice/${q.originalNumber}` }, ["重做"]),
                  el(
                    "button",
                    {
                      class: "nav-btn ghost",
                      onClick: () => {
                        unarchiveWrong(q.id);
                        go("#/wrongbook");
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
