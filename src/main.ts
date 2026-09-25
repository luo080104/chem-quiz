import "./styles.css";
import { loadBank, bindBankVersion } from "./bank";
import { el } from "./ui";
import { renderHome } from "./views/home";
import { renderPractice } from "./views/practice";
import { renderExam, renderExamResult } from "./views/exam";
import { renderWrongbook } from "./views/wrongbook";
import { renderStats } from "./views/stats";
import { renderRules } from "./views/rules";
import { renderData } from "./views/data";
import { renderReview } from "./views/review";
import { renderNotFound } from "./views/notfound";

export interface RouteCtx {
  app: HTMLElement;
  parts: string[];
}

type View = (ctx: RouteCtx) => void | Promise<void>;

const routes: Array<[RegExp, View]> = [
  [/^$/, (c) => renderHome(c)],
  [/^practice(?:\/(\d+))?$/, (c) => renderPractice(c)],
  [/^exam$/, (c) => renderExam(c)],
  [/^exam\/result\/(.+)$/, (c) => renderExamResult(c)],
  [/^wrongbook$/, (c) => renderWrongbook(c)],
  [/^stats$/, (c) => renderStats(c)],
  [/^rules$/, (c) => renderRules(c)],
  [/^data$/, (c) => renderData(c)],
  [/^review$/, (c) => renderReview(c)],
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
  await route();
}

void boot();
