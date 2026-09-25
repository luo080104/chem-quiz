import {
  state,
  exportBackup,
  importBackup,
  clearLearningData,
  STORAGE_KEY,
} from "../store";
import { el } from "../ui";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderData({ app }: RouteCtx): void {
  const msg = el("div", { class: "inline-msg hidden" });

  function show(kind: "ok" | "bad", text: string): void {
    msg.className = `inline-msg ${kind}`;
    msg.textContent = text;
  }

  const fileInput = el("input", {
    type: "file",
    accept: ".json,application/json",
    class: "hidden",
  }) as HTMLInputElement;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importBackup(String(reader.result));
      show(res.ok ? "ok" : "bad", res.message);
      if (res.ok) setTimeout(() => location.reload(), 600);
    };
    reader.readAsText(file);
  });

  function doExport(): void {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `chem-quiz-backup-${Date.now()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    show("ok", "备份已导出（JSON 文件）");
  }

  const s = state();
  const practiced = Object.values(s.practice.records).filter((r) => r.attempts > 0).length;

  app.replaceChildren(
    header("学习记录备份"),
    el("div", { class: "page" }, [
      el("div", { class: "banner warn" }, [
        el("strong", {}, ["清除浏览器数据可能使本机记录丢失。"]),
        el("div", {}, ["请定期导出备份；换机时用导入恢复。"]),
      ]),
      el("div", { class: "cards" }, [
        el("div", { class: "card" }, [
          el("div", { class: "card-label" }, ["已记录题目"]),
          el("div", { class: "card-value" }, [String(practiced)]),
        ]),
        el("div", { class: "card" }, [
          el("div", { class: "card-label" }, ["模拟记录"]),
          el("div", { class: "card-value" }, [String(s.exams.length)]),
        ]),
      ]),
      el("div", { class: "btn-row-col" }, [
        el("button", { class: "primary-btn", onClick: doExport }, ["导出学习记录（JSON）"]),
        el("button", { class: "nav-btn", onClick: () => fileInput.click() }, ["导入备份文件"]),
        el(
          "button",
          {
            class: "nav-btn danger",
            onClick: () => {
              if (window.confirm("确定清空本机学习记录？此操作不可恢复，建议先导出备份。")) {
                clearLearningData();
                show("ok", "已清空本机学习记录");
                setTimeout(() => location.reload(), 600);
              }
            },
          },
          ["清空本机学习记录"]
        ),
      ]),
      fileInput,
      msg,
      el("div", { class: "muted small" }, [
        `存储位置：本机浏览器 localStorage["${STORAGE_KEY}"]。记录包含题库版本号，题库更新后旧记录仍保留版本说明。`,
      ]),
    ])
  );
}
