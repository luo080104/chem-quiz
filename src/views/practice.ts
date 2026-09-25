import { getBank, byOriginalNumber } from "../bank";
import { state, persist, recordPracticeAnswer, toggleFlag, isFlagged } from "../store";
import { el, go, rich, richBlock, richStem, optionContent, studyBlock, pct, sameSet, fmtDateTime } from "../ui";
import { statusLabel, type Question } from "../types";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderPractice({ app, parts }: RouteCtx): void {
  const bank = getBank();
  const total = bank.questions.length;
  const paramN = parts[1] ? Number(parts[1]) : NaN;

  let question: Question | undefined;
  if (Number.isFinite(paramN)) {
    question = byOriginalNumber(paramN);
  } else {
    question = bank.questions[state().practice.lastIndex] ?? bank.questions[0];
  }
  if (!question) {
    app.replaceChildren(header("顺序刷题"), el("div", { class: "page" }, ["题库为空"]));
    return;
  }

  // Remember continuation position (refresh resumes here).
  const idx = bank.questions.findIndex((q) => q.id === question!.id);
  state().practice.lastIndex = idx;
  state().practice.lastQuestionId = question.id;
  state().practice.updatedAt = Date.now();
  persist();

  const selected = new Set<string>();
  let submitted = false;
  let correct: boolean | null = null;

  const optionList = el("div", { class: "options" });
  const resultBox = el("div", { class: "result hidden" });
  const submitBtn = el(
    "button",
    { class: "primary-btn", onClick: () => onPickSubmit() },
    [question.type === "multiple" ? "提交答案（多选）" : "提交答案"]
  );

  function selectedArr(): string[] {
    return [...selected].sort();
  }

  function refreshOptionStyles(): void {
    for (const child of Array.from(optionList.children)) {
      const btn = child as HTMLElement;
      const key = btn.dataset.key!;
      btn.classList.toggle("selected", selected.has(key));
    }
    submitBtn.toggleAttribute("disabled", selected.size === 0);
  }

  function toggleOption(key: string): void {
    if (submitted) return;
    if (question!.type === "multiple") {
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
    } else {
      selected.clear();
      selected.add(key);
    }
    refreshOptionStyles();
  }

  function onPickSubmit(): void {
    if (submitted || selected.size === 0) return;
    submitted = true;
    const chosen = selectedArr();
    if (question!.answer.length === 0) {
      correct = null;
    } else {
      correct = sameSet(chosen, question!.answer);
    }
    recordPracticeAnswer(question!.id, chosen, correct);
    renderResult(chosen);
    refreshOptionStyles();
    renderNav();
  }

  function renderResult(chosen: string[]): void {
    const q = question!;
    resultBox.replaceChildren();
    resultBox.classList.remove("hidden", "ok", "bad", "pending");
    if (correct === null) {
      resultBox.classList.add("pending");
      resultBox.append(
        el("div", { class: "result-title" }, ["本题答案待核，暂不判分"]),
        el("div", { class: "muted" }, [q.explanation || "原题选项为图片，文本导出丢失，待补图后审核。"])
      );
    } else {
      resultBox.classList.add(correct ? "ok" : "bad");
      resultBox.append(
        el("div", { class: "result-title" }, [correct ? "✓ 答对" : "✗ 答错"]),
        el("div", { class: "answer-line" }, [
          el("span", { class: "muted" }, ["正确答案："]),
          rich(q.answer.join(" "), "ans"),
          el("span", { class: "muted" }, [`　你的选择：`]),
          rich(chosen.join(" ") || "（未答）"),
        ]),
        q.phoneAnswer.length
          ? el("div", { class: "answer-line small" }, [
              el("span", { class: "muted" }, ["手机DeepSeek："]),
              rich(q.phoneAnswer.join(" ")),
              sameSet(q.answer, q.phoneAnswer)
                ? el("span", { class: "tag ok" }, ["与本次AI一致"])
                : el("span", { class: "tag bad" }, ["与本次AI分歧，待老师确认"]),
            ])
          : el("span", { class: "hidden" }, []),
        richBlock(q.explanation || "（暂无解析）", "explain")
      );
    }
    const study = studyBlock(q);
    if (study) resultBox.append(study);
    const flagBtn = el(
      "button",
      {
        class: "nav-btn ghost flag-btn",
        onClick: () => {
          const on = toggleFlag(q.id);
          flagBtn.textContent = on ? "已标记不懂（点此取消）" : "标记不懂";
        },
      },
      [isFlagged(q.id) ? "已标记不懂（点此取消）" : "标记不懂"]
    );
    resultBox.append(flagBtn);
    resultBox.append(
      el("div", { class: "src muted small" }, [
        `题目来源：${q.source.question}　|　候选答案来源：${q.source.answer || "无"}　|　状态：${statusLabel(q.reviewStatus)}`,
      ])
    );
  }

  function renderNav(): void {
    const nav = app.querySelector(".practice-nav");
    if (!nav) return;
    nav.replaceChildren(
      el(
        "button",
        { class: "nav-btn", onClick: () => step(-1), disabled: idx <= 0 },
        ["← 上一题"]
      ),
      el("span", { class: "nav-pos" }, [`${idx + 1} / ${total}`]),
      el(
        "button",
        {
          class: "nav-btn",
          onClick: () => step(1),
          disabled: idx >= total - 1,
        },
        [submitted ? "下一题 →" : "下一题（未提交）→"]
      )
    );
  }

  function step(delta: number): void {
    const next = bank.questions[idx + delta];
    if (!next) return;
    go(`#/practice/${next.originalNumber}`);
  }

  // Build options
  for (const opt of question.options) {
    optionList.append(
      el(
        "button",
        { class: "option", "data-key": opt.key, onClick: () => toggleOption(opt.key) },
        [el("span", { class: "opt-key" }, [opt.key]), optionContent(opt)]
      )
    );
  }

  const jumpInput = el("input", {
    class: "jump-input",
    type: "number",
    min: "1",
    max: String(total),
    inputmode: "numeric",
    value: String(question.originalNumber),
  }) as HTMLInputElement;
  const jumpBtn = el(
    "button",
    {
      class: "jump-btn",
      onClick: () => {
        const n = Number(jumpInput.value);
        const target = byOriginalNumber(n);
        if (target) go(`#/practice/${target.originalNumber}`);
      },
    },
    ["跳转"]
  );

  app.replaceChildren(
    header("顺序刷题"),
    el("div", { class: "page" }, [
      el("div", { class: "qmeta" }, [
        el("span", { class: "q-no" }, [`第 ${idx + 1} / ${total} 题`]),
        el("span", { class: "badge neutral" }, [String(question.label || "").replace("chapter", "Ch.")]),
        el("span", { class: `badge ${question.reviewStatus}` }, [statusLabel(question.reviewStatus)]),
      ]),
      el("div", { class: "bar" }, [
        el("div", { class: "bar-fill", style: `width:${pct(idx + 1, total)}%` }),
      ]),
      el("div", { class: "stem" }, [richStem(question.stem, question.stemImages)]),
      optionList,
      el("div", { class: "practice-controls" }, [submitBtn]),
      resultBox,
      el("div", { class: "practice-nav" }),
      el("div", { class: "jump" }, [el("span", { class: "muted small" }, ["题号跳转："]), jumpInput, jumpBtn]),
      el(
        "div",
        { class: "chapter-jump" },
        [...new Set(bank.questions.map((q) => q.label))]
          .filter(Boolean)
          .map((lbl) => {
            const first = bank.questions.find((q) => q.label === lbl)!;
            return el(
              "a",
              { class: "nav-btn ghost", href: `#/practice/${first.originalNumber}` },
              [`${String(lbl).replace("chapter", "Ch.")} 起点`]
            );
          })
      ),
      el("div", { class: "muted small" }, [
        `上次练习：${fmtDateTime(state().practice.updatedAt)}（进度按已提交的不同题数计算）`,
      ]),
    ])
  );
  refreshOptionStyles();
  renderNav();
}
