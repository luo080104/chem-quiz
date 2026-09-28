import { topicById, topicQuestions } from "../bank";
import { el, go, richStem } from "../ui";
import { statusLabel } from "../types";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderTopic({ app, parts }: RouteCtx): void {
  const id = parts[1];
  const topic = topicById(id);
  if (!topic) {
    app.replaceChildren(header("专题"), el("div", { class: "page" }, ["找不到该专题"]));
    return;
  }
  const qs = topicQuestions(id);
  const indexOf = (ch: string, n: number) =>
    qs.findIndex((q) => q.id === `CHEM-${ch}-${String(n).padStart(3, "0")}`);

  const groups = topic.groups.map((g) =>
    el("div", { class: "topic-group" }, [
      el("h3", {}, [g.name]),
      ...g.items.map((it) => {
        const qi = indexOf(it.ch, it.n);
        const q = qi >= 0 ? qs[qi] : undefined;
        return el("div", { class: "topic-item" }, [
          el("div", { class: "review-head" }, [
            el("span", { class: "q-no" }, [`${it.ch.replace("1A", "1a").replace("1B", "1b")}-${it.n}`]),
            q ? el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]) : null,
          ]),
          q ? el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]) : el("div", { class: "muted" }, ["（题号对应不到原题）"]),
          el("div", { class: "muted small" }, [it.note]),
          qi >= 0 ? el("a", { class: "nav-btn ghost", href: `#/topic/${id}/${qi}` }, ["练习这一题"]) : null,
        ]);
      }),
    ])
  );

  app.replaceChildren(
    header("论文专题"),
    el("div", { class: "page" }, [
      el("div", { class: "banner" }, [topic.intro || topic.description]),
      el("div", { class: "muted small" }, [`共抽取 ${qs.length} 题（来自 200 题库）`]),
      el("button", { class: "primary-btn", onClick: () => go(`#/topic/${id}/0`) }, [
        `顺序练习本专题（${qs.length} 题）`,
      ]),
      ...groups,
      el("div", { class: "muted small" }, ["提示：专题练习的“上一题/下一题”只在专题内移动。"]),
    ])
  );
}
