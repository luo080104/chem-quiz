import { getBank } from "../bank";
import { el, rich, richBlock, richStem, studyBlock } from "../ui";
import { statusLabel } from "../types";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderReview({ app }: RouteCtx): void {
  const bank = getBank();
  const counts = bank.meta.counts;
  const needs = bank.questions.filter((q) => q.reviewStatus !== "approved");

  const rows = needs.map((q) =>
    el("div", { class: `review-item ${q.reviewStatus === "approved" ? "ok" : "pending"}` }, [
      el("div", { class: "review-head" }, [
        el("span", { class: "q-no" }, [`原题号 ${q.originalNumber}`]),
        el("span", { class: `badge ${q.reviewStatus}` }, [statusLabel(q.reviewStatus)]),
        q.reviewFlag ? el("span", { class: "tag bad" }, [q.reviewFlag]) : null,
      ]),
      el("div", { class: "stem small" }, [richStem(q.stem, q.stemImages)]),
      el("div", { class: "answer-line small" }, [
        el("span", { class: "muted" }, ["候选答案："]),
        q.answer.length ? rich(q.answer.join(" "), "ans") : el("span", { class: "muted" }, ["（无）"]),
      ]),
      richBlock(q.explanation || "（无解析）", "explain small"),
      studyBlock(q),
    ])
  );

  app.replaceChildren(
    header("待核与争议清单"),
    el("div", { class: "page" }, [
      el("div", { class: "cards" }, [
        el("div", { class: "card" }, [el("div", { class: "card-label" }, ["总数"]), el("div", { class: "card-value" }, [String(counts.total)])]),
        el("div", { class: "card" }, [el("div", { class: "card-label" }, ["已核"]), el("div", { class: "card-value" }, [String(counts.approved)])]),
        el("div", { class: "card" }, [el("div", { class: "card-label" }, ["待核"]), el("div", { class: "card-value" }, [String(counts.pending + counts.pendingImage)])]),
        el("div", { class: "card" }, [el("div", { class: "card-label" }, ["有争议"]), el("div", { class: "card-value" }, [String(counts.contested)])]),
      ]),
      el("div", { class: "banner warn" }, [
        "以下题目尚未审定，候选答案可能与老师/教材不一致。两版AI答案一致也不等于化学审核通过。",
      ]),
      el("div", {}, rows),
    ])
  );
}
