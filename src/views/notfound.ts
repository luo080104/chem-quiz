import { el } from "../ui";
import type { RouteCtx } from "../main";

export function renderNotFound({ app }: RouteCtx): void {
  app.replaceChildren(
    el("div", { class: "page" }, [
      el("h2", {}, ["页面不存在"]),
      el("a", { class: "nav-btn", href: "#/" }, ["返回首页"]),
    ])
  );
}
