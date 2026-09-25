# 大学化学刷题（手机优先网页）

像科目一一样刷大学化学：**顺序刷题** + **随机抽题的仿真模拟**，学习记录保存在手机浏览器本机，
可导出/导入备份。当前为**可运行样机**，使用从课程资料里找到的真实题目训练完整流程；
正式的 250 题原件补齐后，只需替换题库即可上线。

---

## 手机链接（长期稳定）

**https://luo080104.github.io/chem-quiz/**

- 托管：GitHub Pages（仓库 `luo080104/chem-quiz`），手机流量 / 任意网络均可打开，电脑无需开机。
- 更新方式：把改动 `git push` 到 `main` 分支，GitHub Actions 自动构建并发布（见 `.github/workflows/deploy.yml`）。
- 仓库：https://github.com/luo080104/chem-quiz
- 本机局域网（开发调试用，需电脑开机并运行 `npm run preview`）：`http://10.64.93.200:4173/`

如果打不开：换系统浏览器（Chrome / Safari / 微信内置浏览器）重试；首次发布后 CDN 可能有几十秒延迟。

---

## 功能现状

| 模块 | 状态 | 说明 |
|---|---|---|
| 首页两个主入口 | ✅ 已实现 | 「顺序刷题」「仿真模拟」最醒目；显示真实已刷/错题/最近模拟 |
| 250 题顺序刷题 | ✅ 已实现（题库用真实 100 题样机） | 题号+进度条、上一题/下一题/跳转、提交后即时解析、刷新续做 |
| 错题本 | ✅ 已实现 | 首次/最近错误、错误次数、答对过几次、标记已掌握；做对不抹历史 |
| 仿真模拟 | ✅ 交互完整（样机卷，非 250 抽 100） | 正计时、答题卡、交卷前不泄答案、交卷后逐题解析、刷新续卷 |
| 成绩与用时趋势 | ✅ 已实现 | 历次模拟分数与用时；无记录时不显示伪统计 |
| 导出/导入备份 | ✅ 已实现 | JSON 导出/导入；清空需二次确认 |
| 待核/争议清单 | ✅ 已实现 | 逐题显示审核状态、候选答案、争议标记 |
| 化学式 / 图题 | ✅ 已支持 | 保守恢复下标/电荷；图题已抽图并渲染（含 WMF/EMF 转 PNG） |
| 导入 / 审核工具链 | ✅ 已支持 | docx 抽题抽图、保留原题号、建库、校验、两版答案对照 |
| PWA / 断网刷题 | ❌ 未做 | 属独立验收项，未实现前不声称离线可用 |
| 250 题正式题库 | ⏳ 等你提供原件 | 原件到位后导入并逐题审核 |

**样机数据来源**：微信收到的真实课程题
`Chapter 1a Introduction of Chemistry and Matter (Atom Questions).doc`（100 道，A–E 五选一，含 1 道图片选项题）。
答案由本次 AI **独立作答**，全部标记为 `pending`（候选/待核），**未与手机 DeepSeek 答案对照，也未审定**。

---

## 目录结构

```
chem-quiz/
├─ index.html
├─ package.json / tsconfig.json / vite.config.ts
├─ src/                     应用源码（Vite + TypeScript，无框架）
│  ├─ main.ts               入口与路由
│  ├─ types.ts              题库类型
│  ├─ bank.ts               题库加载
│  ├─ store.ts              本机学习记录（localStorage）
│  ├─ render.ts             化学式保守渲染
│  ├─ ui.ts                 DOM 工具
│  ├─ styles.css            手机优先样式
│  └─ views/                home / practice / exam / wrongbook / stats / rules / data / review
├─ public/questions/chem-bank.json     ← 应用实际读取的结构化题库
├─ data/
│  ├─ source/               原始文件（保留，不覆盖）
│  ├─ raw/                  解析出的原始题
│  ├─ answer-keys/          独立作答的候选答案
│  └─ reports/              校验报告
├─ scripts/                 解析 / 建库 / 校验 / 测试 / 抽取脚本
├─ docs/                    阶段说明、审核清单、映射表
└─ dist/                    构建产物（部署用）
```

---

## 常用命令（在 `chem-quiz` 目录）

```powershell
npm install            # 首次安装依赖（已配 npmmirror 镜像）
npm run dev            # 本地开发
npm run build          # 类型检查 + 生产构建到 dist/
npm run preview        # 预览 dist/（--host 供手机访问）
npm test               # 题库校验 + 逻辑测试
npm run parse          # 从 data/source 文本解析题目
npm run build:bank     # 合并题目+答案 -> public/questions/chem-bank.json
```

把手写 Word/PDF 变成题库：

```powershell
# 1) .doc 抽取为文本（使用本机 Word COM）
powershell -ExecutionPolicy Bypass -File scripts/extract-doc.ps1 `
  -In data\source\你的原件.doc -Out data\source\你的原件.txt
# 2) 解析
node scripts/parse-questions.mjs data\source\你的原件.txt data\raw\your.raw.json yourlabel
# 3) 写答案键 data/answer-keys/your.json，再建库
node scripts/build-bank.mjs --raw data\raw\your.raw.json --answers data\answer-keys\your.json `
  --out public\questions\chem-bank.json --bankVersion 1
# 4) 校验
node scripts/validate-bank.mjs public\questions\chem-bank.json data\reports
```

---

## 部署成长期可用的手机链接

应用是**纯静态**（`dist/`），可托管到任意静态站点：

- **Netlify**：把 `dist/` 拖到 Netlify Drop，或用 `netlify deploy --prod --dir dist`
- **Cloudflare Pages / Vercel**：连接仓库，构建命令 `npm run build`，输出目录 `dist`
- **GitHub Pages**：把 `dist/` 推到 `gh-pages` 分支（项目已设 `base: "./"`，子路径可用）

发布前请自行确认课程题目/资料的版权与发布范围。用户学习记录只在本机，链接只分发应用与题库，不包含个人成绩。

---

## 学习记录与备份

- 记录保存在本机浏览器 `localStorage["chemquiz.state.v1"]`，**不上传服务器**。
- **清除浏览器数据/无痕模式可能使记录丢失**，请到「学习记录备份」页定期导出 JSON。
- 记录保存题库版本号；题库修订后旧记录/旧成绩仍能追溯其所用版本。
- 换手机/换浏览器不会自动同步，用导出文件导入恢复。

---

## 已知限制（诚实清单）

1. 当前题库是 **100 题样机**，不是 250 题正式题库；模拟入口标注「样机演示卷」，**不称“250 抽 100 仿真”**。
2. 所有答案均为**由本次 AI 独立给出的候选答案**，`reviewStatus=pending`；未与手机 DeepSeek 逐题对照，未经老师/教材审定。
3. 原题号 63（5 个图片选项）已抽图并判读：**答案 C**（2s 轨道两电子自旋相同，违反泡利不相容原理），仍标待核。
4. 化学式采用**保守式上下标渲染**；图片题经 `extract-docx.py` 抽取并渲染，WMF/EMF 公式图自动转 PNG。复杂结构式仍建议配核对过的图片。
5. 已用 GitHub Pages 长期托管（自动部署）；仓库公开，若日后需要私密托管可再调整。
6. PWA/离线缓存未实现；未做离线验收。

---

## 与手机 DeepSeek 答案的对照（下一步）

按你的方案，阶段 C 应先独立作答存档（本仓库 `data/answer-keys/chapter1a.deepseek-independent.json` 已完成），
**再**打开手机答案逐题对照。请把手机 DeepSeek 的答案解析原件发我（或放到某个本机路径），
我会生成「官方/手机/本次AI」三列对照表与争议清单，绝不把两版 AI 一致当成审定通过。
