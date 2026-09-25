import { getBank } from "../bank";
import { state, practicedQuestionIds, wrongQuestionIds } from "../store";
import { el, fmtDuration, fmtDateTime, pct } from "../ui";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderStats({ app }: RouteCtx): void {
  const bank = getBank();
  const total = bank.questions.length;
  const practiced = practicedQuestionIds().length;
  const wrong = wrongQuestionIds().length;
  const exams = state()
    .exams.filter((e) => e.submittedAt)
    .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));

  const rows = exams.map((e, i) => {
    const prev = i > 0 ? exams[i - 1].correctCount ?? 0 : null;
    const delta = prev === null ? null : (e.correctCount ?? 0) - prev;
    return el("div", { class: "trend-row" }, [
      el("span", { class: "trend-idx" }, [`#${i + 1}`]),
      el("div", { class: "trend-bar" }, [
        el("div", {
          class: "trend-fill",
          style: `width:${pct(e.correctCount ?? 0, e.total)}%`,
        }),
      ]),
      el("span", { class: "trend-score" }, [`${e.correctCount ?? 0}/${e.total}`]),
      el("span", { class: "trend-time muted small" }, [fmtDuration(e.elapsedMs)]),
      el("span", { class: "trend-date muted small" }, [fmtDateTime(e.submittedAt)]),
      delta === null
        ? null
        : el("span", { class: `trend-delta ${delta >= 0 ? "ok" : "bad"}` }, [
            `${delta >= 0 ? "▲" : "▼"}${Math.abs(delta)}`,
          ]),
    ]);
  });

  app.replaceChildren(
    header("成绩与用时"),
    el("div", { class: "page" }, [
      el("div", { class: "cards" }, [
        el("div", { class: "card" }, [
          el("div", { class: "card-label" }, ["顺序进度"]),
          el("div", { class: "card-value" }, [`${practiced}/${total}`]),
          el("div", { class: "card-hint muted small" }, ["至少提交过一次的不同题数"]),
        ]),
        el("div", { class: "card" }, [
          el("div", { class: "card-label" }, ["错题数"]),
          el("div", { class: "card-value" }, [String(wrong)]),
        ]),
        el("div", { class: "card" }, [
          el("div", { class: "card-label" }, ["模拟次数"]),
          el("div", { class: "card-value" }, [String(exams.length)]),
        ]),
      ]),
      el("h2", {}, ["历次模拟成绩与用时趋势"]),
      exams.length === 0
        ? el("div", { class: "empty" }, ["尚无已交卷的模拟记录。"])
        : el("div", { class: "trend" }, rows),
      el("div", { class: "muted small" }, [
        "说明：成绩仅供本人参考；本产品未设及格线，也不代表学校官方计分规则。",
      ]),
    ])
  );
}
