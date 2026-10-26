import { getBank } from "../bank";
import { state, practicedQuestionIds, activeWrongIds, flaggedQuestionIds } from "../store";
import { el, go, pct, fmtDuration, fmtDateTime } from "../ui";
import { APP_VERSION } from "../version";
import { getTheme, toggleTheme } from "../theme";
import { getSfxVolume, setSfxVolume, getMusicVolume, setMusicVolume } from "../audio";
import { buildCram } from "../cram";
import type { RouteCtx } from "../main";

export function renderHome({ app }: RouteCtx): void {
  const bank = getBank();
  const total = bank.questions.length;
  const practiced = practicedQuestionIds().length;
  const wrong = activeWrongIds().length;
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
  const lastPos = Math.min(state().practice.lastIndex + 1, total);
  const seqSub =
    practiced > 0 && lastPos > 0
      ? `上次刷到第 ${lastPos} 题 · 点此继续（共 ${total} 题）`
      : `按原题号顺序练习（共 ${total} 题）`;
  const examTitle = total >= 250 && sampleSize >= 100 ? "仿真模拟 100 题" : `仿真模拟（${sampleSize} 题）`;

  const practicedSet = new Set(practicedQuestionIds());
  const chapterLabels = [...new Set(bank.questions.map((q) => q.label))].filter(Boolean) as string[];
  const chapterRows = chapterLabels.map((lbl) => {
    const qs = bank.questions.filter((q) => q.label === lbl);
    const done = qs.filter((q) => practicedSet.has(q.id)).length;
    return el("div", { class: "progress-wrap" }, [
      el("div", { class: "progress-head" }, [
        el("span", {}, [String(lbl).replace("chapter", "Chapter ")]),
        el("span", { class: "strong" }, [`${done} / ${qs.length}`]),
      ]),
      el("div", { class: "bar" }, [el("div", { class: "bar-fill", style: `width:${pct(done, qs.length)}%` })]),
    ]);
  });

  const uniqueGlossary = new Set(
    bank.questions.flatMap((q) => (q.glossary || []).map((g) => g.term.trim().toLowerCase()))
  ).size;
  const flagged = flaggedQuestionIds().length;
  const cramTotal = buildCram().total;

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
    statCard("错题数", String(wrong), "当前错题（点下方可复习）"),
    lastExam
      ? statCardLink(
          `#/exam/result/${lastExam.id}`,
          "最近模拟（点击查看）",
          `${lastExam.correctCount ?? 0} / ${lastExam.total}`,
          `用时 ${fmtDuration(lastExam.elapsedMs)} · ${fmtDateTime(lastExam.submittedAt)}`
        )
      : statCard("最近模拟", "尚无记录", "完成一次模拟后显示"),
  ]);

  app.replaceChildren(
    el("div", { class: "page" }, [
      el("header", { class: "hero" }, [
        el(
          "button",
          {
            class: "theme-toggle",
            onClick: (e) => {
              const t = toggleTheme();
              (e.currentTarget as HTMLElement).textContent = t === "light" ? "暗色" : "亮色";
            },
          },
          [getTheme() === "light" ? "暗色" : "亮色"]
        ),
        el("h1", {}, ["大学化学刷题"]),
        el("p", { class: "sub" }, ["手机优先 · 本机保存学习记录"]),
      ]),
      demoBanner,
      archiveBanner,
      volRow("音效", getSfxVolume, setSfxVolume),
      volRow("音乐", getMusicVolume, setMusicVolume),
      cramTotal > 0
        ? el(
            "a",
            { class: "banner warn", href: "#/cram", style: "display:block;text-decoration:none;" },
            [`考前突击：${cramTotal} 题待练（模拟错题 + 错题本 + 没练过的）→`]
          )
        : null,
      el("div", { class: "main-actions" }, [
        bigButton(seqTitle, seqSub, "seq", () => go("#/practice")),
        bigButton(
          examTitle,
          `随机无放回抽题 · 正计时（本次抽 ${sampleSize} 题）`,
          "exam",
          () => go("#/exam")
        ),
      ]),
      progressBlock,
      ...chapterRows,
      statCards,
      el("nav", { class: "grid-links" }, [
        link("#/cram", "突击练习", `${cramTotal} 题`, "bolt"),
        link("#/wrongbook", "错题复习", String(wrong) + " 题", "wrong"),
        link("#/flagged", "标记不懂汇总", `${flagged} 题`, "flag"),
        link("#/glossary", "难词 / 术语表", `${uniqueGlossary} 个术语`, "glossary"),
        link("#/search", "搜索题目", "关键词 / 题号", "search"),
        link("#/stats", "成绩与用时", `${exams.length} 次模拟`, "stats"),
        link("#/rules", "规则与关于", `v${APP_VERSION}`, "info"),
        link("#/data", "学习记录备份", "导出 / 导入", "save"),
      ]),
      el("footer", { class: "foot" }, [
        el("div", {}, [`题库：${bank.meta.title}（${bank.meta.bankId} v${bank.meta.version}）`]),
        el("div", {}, [
          `应用 v${APP_VERSION} · 生成时间 ${bank.meta.generatedAt.slice(0, 10)} · 覆盖 ${bank.meta.counts?.translated ?? 0}/${bank.meta.counts?.total ?? 0} 题有翻译`,
        ]),
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

const ICONS: Record<string, string> = {
  seq: '<svg viewBox="0 0 16 16" width="24" height="24" fill="currentColor" shape-rendering="crispEdges"><rect x="2" y="3" width="2" height="2"/><rect x="6" y="3" width="8" height="2"/><rect x="2" y="7" width="2" height="2"/><rect x="6" y="7" width="8" height="2"/><rect x="2" y="11" width="2" height="2"/><rect x="6" y="11" width="8" height="2"/></svg>',
  exam: '<svg viewBox="0 0 16 16" width="24" height="24" fill="currentColor" shape-rendering="crispEdges"><rect x="7" y="1" width="2" height="2"/><rect x="3" y="3" width="10" height="1"/><rect x="2" y="4" width="1" height="8"/><rect x="13" y="4" width="1" height="8"/><rect x="3" y="12" width="10" height="1"/><rect x="7" y="5" width="1" height="4"/><rect x="8" y="8" width="3" height="1"/></svg>',
  wrong: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><g transform="rotate(45 8 8)"><rect x="7" y="2" width="2" height="12"/><rect x="2" y="7" width="12" height="2"/></g></svg>',
  flag: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><rect x="3" y="2" width="1" height="12"/><rect x="4" y="3" width="8" height="2"/><rect x="4" y="5" width="6" height="2"/><rect x="4" y="7" width="4" height="2"/></svg>',
  glossary: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><rect x="2" y="2" width="1" height="12"/><rect x="3" y="2" width="10" height="1"/><rect x="3" y="13" width="10" height="1"/><rect x="12" y="2" width="1" height="12"/><rect x="5" y="5" width="6" height="1"/><rect x="5" y="8" width="6" height="1"/></svg>',
  stats: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><rect x="2" y="9" width="3" height="5"/><rect x="6" y="5" width="3" height="9"/><rect x="10" y="2" width="3" height="12"/></svg>',
  info: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><rect x="7" y="2" width="2" height="2"/><rect x="7" y="6" width="2" height="7"/></svg>',
  save: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><rect x="7" y="1" width="2" height="7"/><rect x="4" y="5" width="2" height="2"/><rect x="10" y="5" width="2" height="2"/><rect x="6" y="7" width="4" height="2"/><rect x="3" y="12" width="10" height="2"/></svg>',
  search: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><rect x="2" y="2" width="8" height="1"/><rect x="2" y="9" width="8" height="1"/><rect x="2" y="2" width="1" height="8"/><rect x="9" y="2" width="1" height="8"/><rect x="10" y="10" width="2" height="2"/><rect x="12" y="12" width="2" height="2"/></svg>',
  bolt: '<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" shape-rendering="crispEdges"><rect x="8" y="1" width="3" height="6"/><rect x="6" y="6" width="4" height="3"/><rect x="5" y="8" width="3" height="7"/></svg>',
};

function iconSpan(name: string, cls: string): HTMLSpanElement {
  const s = el("span", { class: cls });
  s.innerHTML = ICONS[name] || "";
  return s;
}

function volRow(label: string, get: () => number, set: (v: number) => void): HTMLElement {
  const slider = el("input", {
    class: "vol-slider",
    type: "range",
    min: "0",
    max: "100",
    value: String(Math.round(get() * 100)),
  }) as HTMLInputElement;
  const val = el("span", { class: "vol-val" }, [`${Math.round(get() * 100)}%`]);
  slider.addEventListener("input", () => {
    set(Number(slider.value) / 100);
    val.textContent = `${slider.value}%`;
  });
  return el("div", { class: "volume-bar" }, [
    el("span", { class: "vol-label" }, [label]),
    slider,
    val,
  ]);
}

function statCardLink(href: string, label: string, value: string, hint: string): HTMLElement {
  return el("a", { class: "card card-link", href }, [
    el("div", { class: "card-label" }, [label]),
    el("div", { class: "card-value" }, [value]),
    el("div", { class: "card-hint muted small" }, [hint]),
  ]);
}

function bigButton(title: string, sub: string, kind: string, onclick: () => void): HTMLElement {
  return el(
    "button",
    { class: `big-btn ${kind}`, onClick: onclick },
    [
      iconSpan(kind, "big-ico"),
      el("span", { class: "big-title" }, [title]),
      el("span", { class: "big-sub" }, [sub]),
    ]
  );
}

function link(href: string, title: string, sub: string, icon: string): HTMLElement {
  return el("a", { class: "tile", href }, [
    iconSpan(icon, "tile-ico"),
    el("span", { class: "tile-title" }, [title]),
    el("span", { class: "tile-sub muted small" }, [sub]),
  ]);
}
