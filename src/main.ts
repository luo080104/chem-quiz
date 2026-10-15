import "./styles.css";
import { loadBank, bindBankVersion } from "./bank";
import { el } from "./ui";
import { renderHome } from "./views/home";
import { renderPractice, renderDrillWrong, renderDrillFlag } from "./views/practice";
import { renderExam, renderExamResult } from "./views/exam";
import { renderWrongbook } from "./views/wrongbook";
import { renderStats } from "./views/stats";
import { renderRules } from "./views/rules";
import { renderData } from "./views/data";
import { renderFlagged } from "./views/flagged";
import { renderIssues } from "./views/issues";
import { renderGlossary } from "./views/glossary";
import { renderNotFound } from "./views/notfound";

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
  [/^exam$/, (c) => renderExam(c)],
  [/^exam\/result\/(.+)$/, (c) => renderExamResult(c)],
  [/^wrongbook$/, (c) => renderWrongbook(c)],
  [/^stats$/, (c) => renderStats(c)],
  [/^rules$/, (c) => renderRules(c)],
  [/^data$/, (c) => renderData(c)],
  [/^flagged$/, (c) => renderFlagged(c)],
  [/^issues$/, (c) => renderIssues(c)],
  [/^glossary$/, (c) => renderGlossary(c)],
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
      const fab = document.getElementById("issues-fab");
      if (fab) fab.classList.toggle("hidden", path === "issues");
      return;
    }
  }
  renderNotFound({ app, parts });
}

async function boot(): Promise<void> {
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
