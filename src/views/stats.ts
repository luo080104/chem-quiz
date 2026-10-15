import { getBank } from "../bank";
import { state, practicedQuestionIds, activeWrongIds } from "../store";
import { el, fmtDuration, fmtDateTime } from "../ui";
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
  const wrong = activeWrongIds().length;
  const exams = state()
    .exams.filter((e) => e.submittedAt)
    .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));

  const recs = Object.values(state().practice.records).filter((r) => r.attempts > 0);
  const attempts = recs.reduce((a, r) => a + r.attempts, 0);
  const corrects = recs.reduce((a, r) => a + r.correctCount, 0);
  const acc = attempts ? Math.round((corrects / attempts) * 100) : 0;

  const scores = exams.map((e) => e.correctCount ?? 0);
  const best = scores.length ? Math.max(...scores) : 0;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const rows = exams.map((e, i) => {
    const prev = i > 0 ? exams[i - 1].correctCount ?? 0 : null;
    const delta = prev === null ? null : (e.correctCount ?? 0) - prev;
    return el("a", { class: "score-row", href: `#/exam/result/${e.id}` }, [
      el("span", { class: "score-seq" }, [`第 ${i + 1} 次`]),
      el("span", { class: "score-date muted small" }, [fmtDateTime(e.submittedAt)]),
      el("span", { class: "score-score" }, [`${e.correctCount ?? 0} / ${e.total}`]),
      el("span", { class: "score-time muted small" }, [fmtDuration(e.elapsedMs)]),
      delta === null
        ? el("span", { class: "score-delta" }, ["—"])
        : el("span", { class: `score-delta ${delta >= 0 ? "ok" : "bad"}` }, [
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
          el("div", { class: "card-label" }, ["正确率"]),
          el("div", { class: "card-value" }, [`${acc}%`]),
          el("div", { class: "card-hint muted small" }, [`答对 ${corrects}/${attempts} 次`]),
        ]),
        el("div", { class: "card" }, [
          el("div", { class: "card-label" }, ["错题数"]),
          el("div", { class: "card-value" }, [String(wrong)]),
        ]),
        el("div", { class: "card" }, [
          el("div", { class: "card-label" }, ["模拟 / 最高 / 平均"]),
          el("div", { class: "card-value" }, [`${exams.length} / ${best} / ${avg}`]),
        ]),
      ]),
      el("h2", {}, ["模拟成绩单"]),
      exams.length === 0
        ? el("div", { class: "empty" }, ["尚无已交卷的模拟记录。"])
        : el("div", { class: "score-table" }, [
            el("div", { class: "score-row score-head" }, [
              el("span", { class: "score-seq" }, ["次序"]),
              el("span", { class: "score-date" }, ["日期"]),
              el("span", { class: "score-score" }, ["得分"]),
              el("span", { class: "score-time" }, ["用时"]),
              el("span", { class: "score-delta" }, ["较上次"]),
            ]),
            ...rows,
          ]),
      el("div", { class: "muted small" }, [
        "点任意一行 → 查看那一次的成绩、逐题解析，并可“开始练习本次错题”。",
      ]),
      el("div", { class: "muted small" }, [
        "说明：成绩仅供本人参考；本产品未设及格线，也不代表学校官方计分规则。",
      ]),
    ])
  );
}
