import "./styles.css";
import { loadBank, bindBankVersion } from "./bank";
import { el } from "./ui";
import { renderHome } from "./views/home";
import { renderPractice, renderDrillWrong, renderDrillFlag, renderDrillExamWrong } from "./views/practice";
import { renderExam, renderExamResult } from "./views/exam";
import { renderWrongbook } from "./views/wrongbook";
import { renderStats } from "./views/stats";
import { renderRules } from "./views/rules";
import { renderData } from "./views/data";
import { renderFlagged } from "./views/flagged";
import { renderIssues } from "./views/issues";
import { renderGlossary } from "./views/glossary";
import { renderSearch } from "./views/search";
import { renderNotFound } from "./views/notfound";
import { sfx, unlockAudio, startMusic, stopMusic, isMusicOn } from "./audio";
import { initTheme } from "./theme";

export { APP_VERSION } from "./version";

function mountIssuesButton(): void {
  if (document.getElementById("issues-fab")) return;
  document.body.append(
    el("a", { id: "issues-fab", class: "issues-fab", href: "#/issues", title: "遗留问题（答案更正）" }, [
      "遗留问题",
    ])
  );
}

export interface RouteCtx {
  app: HTMLElement;
  parts: string[];
}

type View = (ctx: RouteCtx) => void | Promise<void>;

const routes: Array<[RegExp, View]> = [
  [/^$/, (c) => renderHome(c)],
  [/^practice(?:\/(\d+))?$/, (c) => renderPractice(c)],
  [/^drill\/wrong\/(\d+)$/, (c) => renderDrillWrong(c)],
  [/^drill\/flag\/(\d+)$/, (c) => renderDrillFlag(c)],
  [/^drill\/examwrong\/[^/]+\/\d+$/, (c) => renderDrillExamWrong(c)],
  [/^exam$/, (c) => renderExam(c)],
  [/^exam\/result\/(.+)$/, (c) => renderExamResult(c)],
  [/^wrongbook$/, (c) => renderWrongbook(c)],
  [/^stats$/, (c) => renderStats(c)],
  [/^rules$/, (c) => renderRules(c)],
  [/^data$/, (c) => renderData(c)],
  [/^flagged$/, (c) => renderFlagged(c)],
  [/^issues$/, (c) => renderIssues(c)],
  [/^glossary$/, (c) => renderGlossary(c)],
  [/^search$/, (c) => renderSearch(c)],
];

function currentParts(): string[] {
  const h = location.hash.replace(/^#\/?/, "");
  return h.split("/").filter(Boolean);
}

async function route(): Promise<void> {
  const app = document.getElementById("app") as HTMLElement;
  const parts = currentParts();
  const path = parts.join("/");
  for (const [re, view] of routes) {
    if (re.test(path)) {
      await view({ app, parts });
      window.scrollTo(0, 0);
      if (path === "") {
        if (isMusicOn()) startMusic();
      } else {
        stopMusic();
      }
      const fab = document.getElementById("issues-fab");
      if (fab) {
        const hide =
          path === "issues" ||
          path.startsWith("practice") ||
          path.startsWith("exam") ||
          path.startsWith("drill");
        fab.classList.toggle("hidden", hide);
      }
      return;
    }
  }
  renderNotFound({ app, parts });
}

async function boot(): Promise<void> {
  initTheme();
  const app = document.getElementById("app") as HTMLElement;
  app.replaceChildren(el("div", { class: "loading" }, ["题库加载中…"]));
  try {
    await loadBank();
    bindBankVersion();
  } catch (e) {
    app.replaceChildren(
      el("div", { class: "fatal" }, [
        el("h2", {}, ["题库加载失败"]),
        el("p", {}, [String((e as Error).message || e)]),
        el("p", {}, ["请确认 public/questions/chem-bank.json 存在，或重新运行 npm run build:bank。"]),
      ])
    );
    return;
  }
  document.addEventListener(
    "click",
    (e) => {
      const t = (e.target as HTMLElement)?.closest(
        "button, a, .option, .cell, summary, label, input[type=checkbox]"
      );
      if (!t) return;
      unlockAudio();
      sfx("tap");
      if (isMusicOn() && currentParts().length === 0) startMusic();
    },
    true
  );
  window.addEventListener("hashchange", () => void route());
  mountIssuesButton();
  await route();

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => {});
    });
  }
}

void boot();
