import { byId } from "../bank";
import { state } from "../store";
import { el, rich, richStem, richBlock } from "../ui";
import type { Question } from "../types";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

interface Issue {
  id: string;
  oldAnswer: string;
  note: string;
}

// 从“AI 独立作答”改为“官方答案”时发生变化的题目。
const ISSUES: Issue[] = [
  { id: "CHEM-1A-046", oldAnswer: "D", note: "CuCl₂ 命名：旧答案 D，官方更正为 E（cupric chloride）。" },
  { id: "CHEM-1A-073", oldAnswer: "C", note: "有效核电荷：旧答案 C，官方更正为 A（内层电子的屏蔽）。" },
  { id: "CHEM-1B-039", oldAnswer: "A", note: "键级/键长/键能：旧答案 A，官方更正为 D。" },
  { id: "CHEM-1B-049", oldAnswer: "（当时无答案，未判分）", note: "3 个电子域几何：官方按 E（bent）给分。" },
  { id: "CHEM-2-047", oldAnswer: "C", note: "熵最大：旧答案 C，官方更正为 A（B2F4）。" },
];

export function renderIssues({ app }: RouteCtx): void {
  const items = ISSUES.map((it) => {
    const q = byId(it.id) as Question | undefined;
    if (!q) return el("div", { class: "muted" }, [`找不到题目 ${it.id}`]);
    const rec = state().practice.records[it.id];
    const youPicked = rec && rec.lastAnswer && rec.lastAnswer.length ? rec.lastAnswer.join(" ") : null;
    const youJudge = rec && rec.lastCorrect === true ? "对" : rec && rec.lastCorrect === false ? "错" : "未判";

    const optionLis = q.options.map((o) =>
      el("div", { class: `cell-line${q.answer.includes(o.key) ? " correct" : ""}` }, [
        `${o.key}) ${o.image ? "[图片选项]" : o.text}`,
      ])
    );

    return el("div", { class: "review-item pending" }, [
      el("div", { class: "review-head" }, [
        el("span", { class: "q-no" }, [`${q.label.replace("chapter", "Ch.")} · 原题号 ${q.chapterNumber}`]),
        el("span", { class: "tag bad" }, ["答案已更正"]),
      ]),
      el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
      el("div", { class: "options-list small" }, optionLis),
      el("div", { class: "answer-line" }, [
        el("span", { class: "muted" }, ["官方答案："]),
        rich(q.answer.join(" "), "ans"),
        el("span", { class: "muted" }, ["　旧答案："]),
        el("span", { class: "old-ans" }, [it.oldAnswer]),
      ]),
      youPicked
        ? el("div", { class: "answer-line small" }, [
            el("span", { class: "muted" }, ["你上次选择："]),
            el("span", {}, [youPicked]),
            el("span", { class: `tag ${youJudge === "对" ? "ok" : youJudge === "错" ? "bad" : "pending"}` }, [
              `当时判：${youJudge}`,
            ]),
          ])
        : el("div", { class: "muted small" }, ["（你这台设备上没有这题的作答记录）"]),
      richBlock(it.note, "explain small"),
      richBlock(q.explanation, "explain small"),
      el("div", { class: "btn-row" }, [
        el("a", { class: "nav-btn", href: `#/practice/${q.originalNumber}` }, ["去重做这一题"]),
      ]),
    ]);
  });

  app.replaceChildren(
    header("遗留问题"),
    el("div", { class: "page" }, [
      el("div", { class: "banner warn" }, [
        "这 5 道题的答案由“AI 独立作答”改成了“课程官方 Q&A”。如果你之前做过，当时显示的“对/错”可能和官方相反；下面标出了官方答案、旧答案和你上次的选择。",
      ]),
      ...items,
    ])
  );
}
