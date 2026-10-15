import { getBank, byId } from "../bank";
import {
  state,
  persist,
  recordPracticeAnswer,
  toggleFlag,
  isFlagged,
  activeWrongIds,
  flaggedQuestionIds,
} from "../store";
import {
  el,
  go,
  rich,
  richBlock,
  richStem,
  optionContent,
  studyBlock,
  pct,
  sameSet,
  fmtDateTime,
} from "../ui";
import { statusLabel, type Question } from "../types";
import type { RouteCtx } from "../main";

interface DrillCtx {
  title: string;
  backHref: string;
  backLabel: string;
  basePath: (i: number) => string;
  emptyHint: string;
}

function header(title: string, backHref = "#/", backLabel = "← 首页"): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: backHref }, [backLabel]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

function resolve(ids: string[]): Question[] {
  return ids.map((id) => byId(id)).filter((q): q is Question => !!q);
}

export function renderPractice({ app, parts }: RouteCtx): void {
  const bank = getBank();
  const paramN = parts[1] ? Number(parts[1]) : NaN;
  let startIndex: number;
  if (Number.isFinite(paramN)) {
    startIndex = bank.questions.findIndex((q) => q.originalNumber === paramN);
  } else {
    startIndex = state().practice.lastIndex ?? 0;
  }
  if (startIndex < 0) startIndex = 0;
  renderPracticeList(app, bank.questions, startIndex, null);
}

/** Drill only the active wrong questions. */
export function renderDrillWrong({ app, parts }: RouteCtx): void {
  const list = resolve(activeWrongIds());
  const idx = parts[2] ? Number(parts[2]) : 0;
  renderPracticeList(app, list, idx, {
    title: "错题回测",
    backHref: "#/wrongbook",
    backLabel: "← 错题复习",
    basePath: (i) => `#/drill/wrong/${i}`,
    emptyHint: "错题列表为空，先去做题吧。",
  });
}

/** Drill only the active flagged ("标记不懂") questions. */
export function renderDrillFlag({ app, parts }: RouteCtx): void {
  const list = resolve(flaggedQuestionIds());
  const idx = parts[2] ? Number(parts[2]) : 0;
  renderPracticeList(app, list, idx, {
    title: "标记不懂回测",
    backHref: "#/flagged",
    backLabel: "← 标记不懂",
    basePath: (i) => `#/drill/flag/${i}`,
    emptyHint: "还没有标记不懂的题。",
  });
}

function renderPracticeList(
  app: HTMLElement,
  list: Question[],
  startIndex: number,
  ctx: DrillCtx | null
): void {
  const total = list.length;
  const idx = Math.max(0, Math.min(startIndex, total - 1));
  const question = list[idx];
  if (!question) {
    app.replaceChildren(
      header(ctx ? ctx.title : "顺序刷题", ctx ? ctx.backHref : "#/", ctx ? ctx.backLabel : "← 首页"),
      el("div", { class: "page" }, [ctx ? ctx.emptyHint : "题库为空"])
    );
    return;
  }

  if (!ctx) {
    state().practice.lastIndex = getBank().questions.findIndex((q) => q.id === question.id);
    state().practice.lastQuestionId = question.id;
    state().practice.updatedAt = Date.now();
    persist();
  }

  const selected = new Set<string>();
  let submitted = false;
  let correct: boolean | null = null;
  let leaving = false;

  const optionList = el("div", { class: "options" });
  const resultBox = el("div", { class: "result hidden" });
  const submitBtn = el(
    "button",
    { class: "primary-btn", onClick: () => onPickSubmit() },
    [question.type === "multiple" ? "提交答案（多选）" : "提交答案"]
  );

  // Restore the previous result when revisiting an already-answered question.
  const stored = state().practice.records[question.id];
  const already = !!(
    stored &&
    stored.attempts > 0 &&
    Array.isArray(stored.lastAnswer) &&
    stored.lastAnswer.length > 0
  );
  if (already && stored) {
    for (const k of stored.lastAnswer) selected.add(k);
    submitted = true;
    correct = stored.lastCorrect;
  }

  function updateSubmit(): void {
    submitBtn.classList.toggle("hidden", submitted);
  }

  function selectedArr(): string[] {
    return [...selected].sort();
  }

  function refreshOptionStyles(): void {
    for (const child of Array.from(optionList.children)) {
      const btn = child as HTMLElement;
      btn.classList.toggle("selected", selected.has(btn.dataset.key!));
    }
    submitBtn.toggleAttribute("disabled", selected.size === 0);
  }

  function toggleOption(key: string): void {
    if (submitted) return;
    if (question.type === "multiple") {
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
    correct = question.answer.length === 0 ? null : sameSet(chosen, question.answer);
    recordPracticeAnswer(question.id, chosen, correct);
    renderResult(chosen);
    refreshOptionStyles();
    renderNav();
    updateSubmit();
    // 答对自动下一题；答错/待核停在本页显示解析。
    if (correct === true && idx < total - 1) {
      setTimeout(() => {
        if (leaving || !resultBox.isConnected) return;
        step(1);
      }, 900);
    }
  }

  function renderResult(chosen: string[]): void {
    const q = question;
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
          el("span", { class: "muted" }, ["　你的选择："]),
          rich(chosen.join(" ") || "（未答）"),
        ]),
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
      el(
        "button",
        {
          class: "nav-btn ghost",
          onClick: () => {
            leaving = false;
            submitted = false;
            correct = null;
            selected.clear();
            resultBox.classList.add("hidden");
            resultBox.replaceChildren();
            updateSubmit();
            refreshOptionStyles();
            renderNav();
          },
        },
        ["重做本题"]
      )
    );
    resultBox.append(
      el("div", { class: "src muted small" }, [
        `题目来源：${q.source.question}　|　答案来源：${q.source.answer || "无"}　|　状态：${statusLabel(q.reviewStatus)}`,
      ])
    );
  }

  function step(delta: number): void {
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= total) return;
    leaving = true;
    if (ctx) go(ctx.basePath(nextIdx));
    else go(`#/practice/${list[nextIdx].originalNumber}`);
  }

  function renderNav(): void {
    navEl.replaceChildren(
      el("button", { class: "nav-btn", onClick: () => step(-1), disabled: idx <= 0 }, ["← 上一题"]),
      el("span", { class: "nav-pos" }, [`${idx + 1} / ${total}`]),
      el("button", { class: "nav-btn", onClick: () => step(1), disabled: idx >= total - 1 }, [
        submitted ? "下一题 →" : "下一题（未提交）→",
      ])
    );
  }

  for (const opt of question.options) {
    optionList.append(
      el("button", { class: "option", "data-key": opt.key, onClick: () => toggleOption(opt.key) }, [
        el("span", { class: "opt-key" }, [opt.key]),
        optionContent(opt),
      ])
    );
  }

  const navEl = el("div", { class: "practice-nav" });

  const jumpInput = el("input", {
    class: "jump-input",
    type: "number",
    min: "1",
    max: String(getBank().questions.length),
    inputmode: "numeric",
    value: String(question.originalNumber),
  }) as HTMLInputElement;
  const jumpBtn = el(
    "button",
    {
      class: "jump-btn",
      onClick: () => {
        const target = getBank().questions.find((q) => q.originalNumber === Number(jumpInput.value));
        if (target) go(`#/practice/${target.originalNumber}`);
      },
    },
    ["跳转"]
  );

  const chapterJump = ctx
    ? null
    : el(
        "div",
        { class: "chapter-jump" },
        [...new Set(getBank().questions.map((q) => q.label))]
          .filter(Boolean)
          .map((lbl) => {
            const first = getBank().questions.find((q) => q.label === lbl)!;
            return el("a", { class: "nav-btn ghost", href: `#/practice/${first.originalNumber}` }, [
              `${String(lbl).replace("chapter", "Ch.")} 起点`,
            ]);
          })
      );

  app.replaceChildren(
    header(
      ctx ? ctx.title : "顺序刷题",
      ctx ? ctx.backHref : "#/",
      ctx ? ctx.backLabel : "← 首页"
    ),
    el("div", { class: "page" }, [
      el("div", { class: "qmeta" }, [
        el("span", { class: "q-no" }, [`第 ${idx + 1} / ${total} 题`]),
        el("span", { class: "badge neutral" }, [
          ctx ? ctx.title : String(question.label || "").replace("chapter", "Ch."),
        ]),
        el("span", { class: `badge ${question.reviewStatus}` }, [statusLabel(question.reviewStatus)]),
      ]),
      el("div", { class: "bar" }, [
        el("div", { class: "bar-fill", style: `width:${pct(idx + 1, total)}%` }),
      ]),
      el("div", { class: "stem" }, [richStem(question.stem, question.stemImages)]),
      optionList,
      el("div", { class: "practice-controls" }, [submitBtn]),
      resultBox,
      navEl,
      ctx ? null : el("div", { class: "jump" }, [el("span", { class: "muted small" }, ["题号跳转："]), jumpInput, jumpBtn]),
      chapterJump,
      el("div", { class: "muted small" }, [
        ctx
          ? "回测中的每题都可提交、看解析、并可“标记不懂”。"
          : `上次练习：${fmtDateTime(state().practice.updatedAt)}（进度按已提交的不同题数计算）`,
      ]),
    ])
  );
  refreshOptionStyles();
  renderNav();
  updateSubmit();
  if (already) renderResult(selectedArr());
}
