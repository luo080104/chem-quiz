import { getBank } from "../bank";
import { state, practicedQuestionIds, wrongQuestionIds } from "../store";
import { el, go, pct, fmtDuration, fmtDateTime } from "../ui";
import type { RouteCtx } from "../main";

export function renderHome({ app }: RouteCtx): void {
  const bank = getBank();
  const total = bank.questions.length;
  const practiced = practicedQuestionIds().length;
  const wrong = wrongQuestionIds().length;
  const exams = state()
    .exams.filter((e) => e.submittedAt)
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  const lastExam = exams[0];

  const demoPieces: (Node | string)[] = [];
  if (total < 250) {
    demoPieces.push(`当前题库 ${total} 题（真实 Chapter 1a 题），未达到 250 题。`);
  }
  if (bank.meta.counts.approved === 0) {
    demoPieces.push("所有答案均为“候选/待核”，尚未审定；不得当作学校标准答案。");
  }
  const demoBanner =
    demoPieces.length > 0
      ? el("div", { class: "banner warn" }, [
          el("strong", {}, ["样机状态："]),
          el("span", {}, [demoPieces.join(" ")]),
        ])
      : null;

  const archivedIds = Object.keys(state().archivedBanks || {});
  const archiveBanner =
    archivedIds.length > 0
      ? el("div", { class: "banner" }, [
          `检测到题库已更换，旧记录已归档（${archivedIds.join(", ")}）。当前仅统计现用题库的进度。`,
        ])
      : null;

  const sampleSize = Math.min(100, bank.questions.filter((q) => q.answer.length).length);
  const seqTitle = total >= 250 ? "顺序刷 250 题" : `顺序刷题（${total} 题）`;
  const examTitle = total >= 250 && sampleSize >= 100 ? "仿真模拟 100 题" : `仿真模拟（${sampleSize} 题）`;

  const progressBlock = el("div", { class: "progress-wrap" }, [
    el("div", { class: "progress-head" }, [
      el("span", {}, [`已刷题数`]),
      el("span", { class: "strong" }, [`${practiced} / ${total}`]),
    ]),
    el("div", { class: "bar" }, [
      el("div", { class: "bar-fill", style: `width:${pct(practiced, total)}%` }),
    ]),
    el("div", { class: "muted small" }, [
      `进度按“至少提交过一次的不同题目数”统计，不按点击到第几题。`,
    ]),
  ]);

  const statCards = el("div", { class: "cards" }, [
    statCard("错题数", String(wrong), "历史答错过的不同题目"),
    lastExam
      ? statCard(
          "最近模拟",
          `${lastExam.correctCount ?? 0} / ${lastExam.total}`,
          `用时 ${fmtDuration(lastExam.elapsedMs)} · ${fmtDateTime(lastExam.submittedAt)}`
        )
      : statCard("最近模拟", "尚无记录", "完成一次模拟后显示"),
  ]);

  app.replaceChildren(
    el("div", { class: "page" }, [
      el("header", { class: "hero" }, [
        el("h1", {}, ["大学化学刷题"]),
        el("p", { class: "sub" }, ["手机优先 · 本机保存学习记录"]),
      ]),
      demoBanner,
      archiveBanner,
      el("div", { class: "main-actions" }, [
        bigButton(seqTitle, `按原题号顺序练习（当前 ${total} 题）`, "seq", () => go("#/practice")),
        bigButton(
          examTitle,
          `随机无放回抽题 · 正计时（本次抽 ${sampleSize} 题）`,
          "exam",
          () => go("#/exam")
        ),
      ]),
      progressBlock,
      statCards,
      el("nav", { class: "grid-links" }, [
        link("#/wrongbook", "错题复习", String(wrong) + " 题"),
        link("#/stats", "成绩与用时", `${exams.length} 次模拟`),
        link("#/rules", "规则说明", "判分与免责"),
        link("#/data", "学习记录备份", "导出 / 导入"),
        link("#/review", "待核与争议清单", "题库质量"),
      ]),
      el("footer", { class: "foot" }, [
        el("div", {}, [
          `题库：${bank.meta.title}（${bank.meta.bankId} v${bank.meta.version}）`,
        ]),
        el("div", {}, [`生成时间 ${bank.meta.generatedAt.slice(0, 10)}`]),
      ]),
    ])
  );
}

function statCard(label: string, value: string, hint: string): HTMLElement {
  return el("div", { class: "card" }, [
    el("div", { class: "card-label" }, [label]),
    el("div", { class: "card-value" }, [value]),
    el("div", { class: "card-hint muted small" }, [hint]),
  ]);
}

function bigButton(title: string, sub: string, kind: string, onclick: () => void): HTMLElement {
  return el(
    "button",
    { class: `big-btn ${kind}`, onClick: onclick },
    [el("span", { class: "big-title" }, [title]), el("span", { class: "big-sub" }, [sub])]
  );
}

function link(href: string, title: string, sub: string): HTMLElement {
  return el("a", { class: "tile", href }, [
    el("span", { class: "tile-title" }, [title]),
    el("span", { class: "tile-sub muted small" }, [sub]),
  ]);
}
