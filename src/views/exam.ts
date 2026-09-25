import { getBank, byId, scorableQuestions } from "../bank";
import { state, persist, uid, sampleIds, nowMs, reloadState } from "../store";
import { el, go, rich, richBlock, richStem, optionContent, fmtDuration, fmtDateTime, sameSet } from "../ui";
import { statusLabel, type Question } from "../types";
import type { RouteCtx, } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

function activeExam() {
  const s = state();
  if (!s.activeExamId) return null;
  return s.exams.find((e) => e.id === s.activeExamId && !e.submittedAt) || null;
}

export function renderExam({ app }: RouteCtx): void {
  const exam = activeExam();
  if (!exam) {
    renderExamStart(app);
    return;
  }
  renderExamRunning(app, exam.id);
}

function renderExamStart(app: HTMLElement): void {
  const bank = getBank();
  const pool = scorableQuestions();
  const size = Math.min(100, pool.length);
  const isReal = bank.questions.length >= 250 && pool.length >= 100;

  app.replaceChildren(
    header("仿真模拟"),
    el("div", { class: "page" }, [
      el("div", { class: isReal ? "banner ok" : "banner warn" }, [
        el("strong", {}, [isReal ? "正式仿真：250 抽 100" : "样机演示卷"]),
        el("div", {}, [
          isReal
            ? "从 250 道已核题中随机无放回抽取 100 题。"
            : `当前题库 ${bank.questions.length} 题（可判分 ${pool.length} 题），本次仅演示模拟流程，不是“250 抽 100 仿真”。`,
        ]),
      ]),
      el("ul", { class: "rules-list" }, [
        el("li", {}, [`本次抽题：${size} 题`]),
        el("li", {}, ["正计时显示用时，不设倒计时、不自动交卷"]),
        el("li", {}, ["交卷前不显示正确答案与解析"]),
        el("li", {}, ["刷新会恢复同一套卷、已答内容与计时"]),
        el("li", {}, ["未答记 0 分，不倒扣；暂无及格线"]),
      ]),
      el(
        "button",
        {
          class: "primary-btn",
          disabled: size === 0,
          onClick: () => startExam(),
        },
        [size === 0 ? "没有可判分的题目" : `开始模拟（${size} 题）`]
      ),
    ])
  );
}

function startExam(): void {
  const s = state();
  const pool = scorableQuestions().map((q) => q.id);
  const seed = (Math.random() * 2 ** 31) >>> 0;
  const ids = sampleIds(pool, 100, seed);
  const bank = getBank();
  const rec = {
    id: uid("exam"),
    seed,
    bankVersion: bank.meta.version,
    bankId: bank.meta.bankId,
    questionIds: ids,
    startedAt: nowMs(),
    submittedAt: null,
    elapsedMs: 0,
    lastTickAt: nowMs(),
    answers: {},
    correctCount: null,
    total: ids.length,
    cursor: 0,
  };
  s.exams.push(rec);
  s.activeExamId = rec.id;
  persist();
  // Force a re-render even if the hash is already "#/exam".
  if (location.hash === "#/exam") {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    go("#/exam");
  }
}

function renderExamRunning(app: HTMLElement, examId: string): void {
  const exam = state().exams.find((e) => e.id === examId);
  if (!exam) {
    renderExamStart(app);
    return;
  }
  const qs = exam.questionIds.map((id) => byId(id)).filter((q): q is Question => !!q);
  let cursor = Math.max(0, Math.min(exam.cursor, qs.length - 1));

  const timerEl = el("span", { class: "timer" }, ["0:00"]);
  const qBox = el("div", { class: "exam-qbox" });
  const cardOverlay = el("div", { class: "overlay hidden" });
  const cardGrid = el("div", { class: "card-grid" });
  const navEl = el("div", { class: "practice-nav" });

  function elapsed(): number {
    return exam!.submittedAt ? exam!.elapsedMs : nowMs() - exam!.startedAt;
  }

  function tick(): void {
    if (!timerEl.isConnected) return;
    timerEl.textContent = fmtDuration(elapsed());
  }
  const interval = window.setInterval(tick, 1000);
  // safety cleanup if this view is torn down without clearing
  window.addEventListener("hashchange", () => window.clearInterval(interval), { once: true });

  function saveAnswer(qid: string, chosen: string[]): void {
    if (chosen.length) exam!.answers[qid] = chosen;
    else delete exam!.answers[qid];
    persist();
  }

  function toggle(qid: string, key: string, type: string): void {
    const cur = new Set(exam!.answers[qid] || []);
    if (type === "multiple") {
      if (cur.has(key)) cur.delete(key);
      else cur.add(key);
    } else {
      cur.clear();
      cur.add(key);
    }
    saveAnswer(qid, [...cur]);
    paintOptions();
    renderCardGrid();
  }

  function paintOptions(): void {
    const q = qs[cursor];
    for (const child of Array.from(qBox.querySelectorAll(".option"))) {
      const btn = child as HTMLElement;
      const chosen = new Set(exam!.answers[q.id] || []);
      btn.classList.toggle("selected", chosen.has(btn.dataset.key!));
    }
  }

  function renderQuestion(): void {
    const q = qs[cursor];
    exam!.cursor = cursor;
    persist();
    const chosen = new Set(exam!.answers[q.id] || []);
    const opts = el("div", { class: "options" });
    for (const opt of q.options) {
      opts.append(
        el(
          "button",
          { class: `option${chosen.has(opt.key) ? " selected" : ""}`, "data-key": opt.key, onClick: () => toggle(q.id, opt.key, q.type) },
          [el("span", { class: "opt-key" }, [opt.key]), optionContent(opt)]
        )
      );
    }
    qBox.replaceChildren(
      el("div", { class: "qmeta" }, [
        el("span", { class: "q-no" }, [`第 ${cursor + 1} / ${qs.length} 题`]),
        el("span", { class: "badge neutral" }, [q.type === "multiple" ? "多选" : "单选"]),
      ]),
      el("div", { class: "bar" }, [
        el("div", { class: "bar-fill", style: `width:${Math.round(((cursor + 1) / qs.length) * 100)}%` }),
      ]),
      el("div", { class: "stem" }, [richStem(q.stem, q.stemImages)]),
      opts
    );
    renderNav();
    renderCardGrid();
  }

  function renderNav(): void {
    navEl.replaceChildren(
      el("button", { class: "nav-btn", disabled: cursor <= 0, onClick: () => { cursor--; renderQuestion(); } }, ["← 上一题"]),
      el("button", { class: "nav-btn ghost", onClick: () => cardOverlay.classList.remove("hidden") }, ["答题卡"]),
      el("button", { class: "nav-btn", disabled: cursor >= qs.length - 1, onClick: () => { cursor++; renderQuestion(); } }, ["下一题 →"])
    );
  }

  function renderCardGrid(): void {
    cardGrid.replaceChildren();
    qs.forEach((q, i) => {
      const answered = (exam!.answers[q.id] || []).length > 0;
      cardGrid.append(
        el(
          "button",
          { class: `cell${answered ? " answered" : " unanswered"}${i === cursor ? " current" : ""}`, onClick: () => { cursor = i; cardOverlay.classList.add("hidden"); renderQuestion(); } },
          [String(i + 1)]
        )
      );
    });
  }

  function submit(): void {
    const unanswered = qs.filter((q) => !(exam!.answers[q.id] || []).length).length;
    const msg = unanswered > 0 ? `还有 ${unanswered} 题未答，确定交卷？` : "确定交卷？";
    if (!window.confirm(msg)) return;
    doSubmit(exam!, qs);
  }

  cardOverlay.append(
    el("div", { class: "overlay-panel" }, [
      el("div", { class: "overlay-head" }, [
        el("strong", {}, ["答题卡"]),
        el("button", { class: "x", onClick: () => cardOverlay.classList.add("hidden") }, ["关闭"]),
      ]),
      cardGrid,
      el("div", { class: "muted small" }, [
        `已答 ${qs.filter((q) => (exam!.answers[q.id] || []).length > 0).length} / ${qs.length}，未答 ${qs.filter((q) => !(exam!.answers[q.id] || []).length).length}。绿色=已答，斜纹=未答，蓝色边框=当前题。`,
      ]),
    ])
  );

  app.replaceChildren(
    header("仿真模拟"),
    el("div", { class: "page" }, [
      el("div", { class: "exam-top" }, [
        el("span", { class: "exam-label" }, [`用时（正计时）`]),
        timerEl,
      ]),
      qBox,
      navEl,
      el("button", { class: "primary-btn submit-exam", onClick: submit }, ["交卷"]),
      el("div", { class: "muted small" }, [
        `本卷题库版本 v${exam.bankVersion} · 种子 ${exam.seed} · 开考 ${fmtDateTime(exam.startedAt)}`,
      ]),
      cardOverlay,
    ])
  );
  renderQuestion();
  tick();
}

function doSubmit(exam: NonNullable<ReturnType<typeof activeExam>>, qs: Question[]): void {
  let correct = 0;
  for (const q of qs) {
    const chosen = exam.answers[q.id] || [];
    if (q.answer.length && sameSet(chosen, q.answer)) correct++;
  }
  exam.submittedAt = nowMs();
  exam.elapsedMs = exam.submittedAt - exam.startedAt;
  exam.correctCount = correct;
  state().activeExamId = null;
  persist();
  go(`#/exam/result/${exam.id}`);
}

export function renderExamResult({ app, parts }: RouteCtx): void {
  reloadState();
  const examId = parts[2];
  const exam = state().exams.find((e) => e.id === examId);
  if (!exam) {
    app.replaceChildren(header("模拟结果"), el("div", { class: "page" }, ["找不到该次模拟记录"]));
    return;
  }
  const bankChanged = exam.bankId !== getBank().meta.bankId;
  const qs = bankChanged
    ? []
    : exam.questionIds.map((id) => byId(id)).filter((q): q is Question => !!q);
  const items: HTMLElement[] = [];
  qs.forEach((q, i) => {
    const chosen = exam.answers[q.id] || [];
    const scorable = q.answer.length > 0;
    const ok = scorable && sameSet(chosen, q.answer);
    items.push(
      el("div", { class: `review-item ${scorable ? (ok ? "ok" : "bad") : "pending"}` }, [
        el("div", { class: "review-head" }, [
          el("span", { class: "q-no" }, [`第 ${i + 1} 题`]),
          el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]),
          scorable
            ? el("span", { class: `tag ${ok ? "ok" : "bad"}` }, [ok ? "答对" : "答错"])
            : el("span", { class: "tag pending" }, ["待核"]),
        ]),
        el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
        scorable
          ? el("div", { class: "answer-line" }, [
              el("span", { class: "muted" }, ["正确答案："]),
              rich(q.answer.join(" "), "ans"),
              el("span", { class: "muted" }, ["　你的选择："]),
              rich(chosen.join(" ") || "（未答）"),
            ])
          : el("div", { class: "muted" }, ["（此题为图片选项，待补图后判分）"]),
        richBlock(q.explanation || "（暂无解析）", "explain small"),
      ])
    );
  });

  app.replaceChildren(
    header("模拟结果"),
    el("div", { class: "page" }, [
      el("div", { class: "score-card" }, [
        el("div", { class: "score-num" }, [`${exam.correctCount ?? 0} / ${exam.total}`]),
        el("div", { class: "muted" }, [`用时 ${fmtDuration(exam.elapsedMs)} · ${fmtDateTime(exam.submittedAt)}`]),
        el("div", { class: "muted small" }, [`题库版本 v${exam.bankVersion} · 种子 ${exam.seed}`]),
      ]),
      bankChanged
        ? el("div", { class: "banner warn" }, [
            `该次模拟使用的题库（${exam.bankId} v${exam.bankVersion}）与当前题库不同，逐题解析不可用；仅保留成绩与用时。`,
          ])
        : null,
      el("div", { class: "btn-row" }, [
        el("a", { class: "nav-btn", href: "#/" }, ["返回首页"]),
        el("a", { class: "nav-btn", href: "#/stats" }, ["看历次趋势"]),
        el("a", { class: "nav-btn", href: "#/wrongbook" }, ["错题复习"]),
      ]),
      bankChanged ? null : el("h2", {}, ["逐题解析"]),
      ...items,
    ])
  );
}
