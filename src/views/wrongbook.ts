import { state, persist } from "../store";
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
  const entries = Object.values(s.wrongbook).sort((a, b) => b.lastWrongAt - a.lastWrongAt);

  const items = entries.map((w) => {
    const q = byId(w.questionId) as Question | undefined;
    const no = q ? `第 ${q.originalNumber} 题` : w.questionId;
    return el("div", { class: `review-item ${w.mastered ? "ok" : "bad"}` }, [
      el("div", { class: "review-head" }, [
        el("span", { class: "q-no" }, [no]),
        q ? el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]) : null,
        el("span", { class: "tag bad" }, [`错 ${w.wrongCount} 次`]),
        w.correctAfterWrong > 0 ? el("span", { class: "tag ok" }, [`答对过 ${w.correctAfterWrong} 次`]) : null,
        w.mastered ? el("span", { class: "tag ok" }, ["已掌握"]) : null,
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
        w.mastered
          ? el("button", { class: "nav-btn ghost", onClick: () => { w.mastered = false; persist(); go("#/wrongbook"); } }, ["取消已掌握"])
          : el("button", { class: "nav-btn ghost", onClick: () => { w.mastered = true; persist(); go("#/wrongbook"); } }, ["标记已掌握"]),
      ]),
    ]);
  });

  app.replaceChildren(
    header("错题复习"),
    el("div", { class: "page" }, [
      el("div", { class: "muted small" }, [
        "做对一次不会抹掉历史错误；已掌握需手动标记，且不删除错误记录。",
      ]),
      entries.length === 0
        ? el("div", { class: "empty" }, ["暂无错题。先去顺序刷题或模拟考吧。"])
        : el("div", {}, items),
    ])
  );
}
