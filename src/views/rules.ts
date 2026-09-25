import { getBank } from "../bank";
import { el } from "../ui";
import { APP_VERSION } from "../version";
import type { RouteCtx } from "../main";

function header(title: string): HTMLElement {
  return el("header", { class: "topbar" }, [
    el("a", { class: "back", href: "#/" }, ["← 首页"]),
    el("span", { class: "topbar-title" }, [title]),
  ]);
}

export function renderRules({ app }: RouteCtx): void {
  const bank = getBank();
  app.replaceChildren(
    header("规则说明"),
    el("div", { class: "page prose" }, [
      el("div", { class: "banner warn" }, [
        el("strong", {}, ["重要：以下为本产品的暂定规则，不是学校官方规则。"]),
      ]),
      el("h2", {}, ["当前判分规则（产品规则，暂定）"]),
      el("ul", {}, [
        el("li", {}, ["单选/判断：选对得 1 分。"]),
        el("li", {}, ["多选：所选集合与正确答案完全一致才得 1 分（每题分值相同）。"]),
        el("li", {}, ["未作答：0 分。"]),
        el("li", {}, ["不倒扣。"]),
        el("li", {}, ["不设及格线，不显示“及格/不及格”。"]),
      ]),
      el("p", { class: "muted" }, [
        "待核事项：学校是否有多选部分分规则、是否存在主观/计算题的容差判分，均需你或老师确认后调整；确认前不擅自编造。",
      ]),
      el("h2", {}, ["顺序刷题"]),
      el("ul", {}, [
        el("li", {}, ["按原题号先后走题，显示当前题号与进度条。"]),
        el("li", {}, ["可上一题、下一题、题号跳转；刷新后从上次位置继续。"]),
        el("li", {}, ["提交后显示对错、正确答案与解析；答错自动进入错题本。"]),
        el("li", {}, ["进度按“至少提交过一次的不同题目数”统计，不按点击到第几题。"]),
      ]),
      el("h2", {}, ["仿真模拟"]),
      el("ul", {}, [
        el("li", {}, ["随机无放回抽题；只有当题库达到 250 道已核题时，才称为“250 抽 100 仿真”。"]),
        el("li", {}, ["正计时显示用时，不设倒计时、不自动交卷。"]),
        el("li", {}, ["考试过程中可切题、看答题卡，但不显示正确答案与解析。"]),
        el("li", {}, ["交卷后显示正确题数、错题与逐题解析。"]),
        el("li", {}, ["刷新恢复同一套卷、已答内容与计时（按保存的题目ID顺序与随机种子）。"]),
      ]),
      el("h2", {}, ["答案与审核状态"]),
      el("p", {}, [
        `当前题库 ${bank.meta.bankId} v${bank.meta.version}，共 ${bank.meta.counts.total} 题；`,
        `已核 ${bank.meta.counts.approved}，待核 ${bank.meta.counts.pending}，缺图待核 ${bank.meta.counts.pendingImage}，有争议 ${bank.meta.counts.contested}。`,
      ]),
      el("p", { class: "muted" }, [
        "候选答案由本次AI独立给出，尚未与手机DeepSeek答案逐题对照，也未经课程/教材审定。两版AI答案一致也不等于化学审核通过。",
      ]),
      el("h2", {}, ["学习记录与隐私"]),
      el("ul", {}, [
        el("li", {}, ["学习记录保存在当前手机浏览器本机，不上传服务器。"]),
        el("li", {}, ["清除浏览器数据/无痕模式可能导致本机记录丢失，请在“学习记录备份”导出。"]),
        el("li", {}, ["换设备或换浏览器不会自动同步。"]),
      ]),
      el("h2", {}, ["关于与安装"]),
      el("ul", {}, [
        el("li", {}, [`应用版本 v${APP_VERSION}（正式 1.0）。`]),
        el("li", {}, ["支持“添加到主屏幕/桌面”，像 App 一样使用。"]),
        el("li", {}, ["首次在线打开后会自动缓存，支持断网刷题；题库更新后联网打开即刷新。"]),
        el("li", {}, ["学习记录仅保存在本机浏览器，不上传服务器。"]),
      ]),
      el("p", { class: "muted small" }, [bank.meta.disclaimer]),
    ])
  );
}
