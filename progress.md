# Progress Log

## 2026-09-25（首次会话）

### 已完成
1. 环境与输入检索；确认正式 250 题与手机答案原件不在本机。
2. 找到并**保留**真实课程题样机；新建独立项目 `C:\Users\luoji\Desktop\chem-quiz`。
3. 解析 `.doc` → 100 题（修正图片选项导致的丢题）。
4. 本次 AI **独立作答** 99 题（1 题图片无法判读），写入 `data/answer-keys/`，全部标 `pending`。
5. 结构化题库 `public/questions/chem-bank.json`（含来源、审核状态、版本、争议标记）。
6. 校验：100 题，**0 结构错误**，报告在 `data/reports/`。
7. 应用（Vite + TS）：首页两主入口、顺序刷题、即时解析、错题本、仿真模拟（正计时/答题卡/交卷复盘）、成绩趋势、规则页、备份页、待核清单。
8. 逻辑测试 7 项全过：抽题去重与确定性、判分、错题历史不抹除、未答/待核不入错题、导入导出往返。
9. 构建 `dist/`，启动预览并起公网临时隧道，公网 URL 实测 200。
10. 文档：README、阶段 A 核对表、题库映射表、三份规划文件。

### 产物
- 源码：`src/`（9 个视图 + 核心模块）
- 题库：`public/questions/chem-bank.json`（100 题，v1）
- 测试报告：`data/reports/validate-report.{json,txt}`
- 阶段文档：`docs/`

### 手机链接
- 局域网：`http://10.64.93.200:4173/`
- 公网（临时）：`https://essentials-precision-hats-enter.trycloudflare.com`

### 未完成 / 阻塞
- 正式 250 题原件、手机 DeepSeek 答案原件：**等用户提供**。
- 阶段 C 全流程、实际手机人工验收、长期稳定部署、PWA/离线：**未完成**。

### 运行中的进程（电脑重启后需重开）
- `npm run preview`（端口 4173）
- `tools\cloudflared.exe tunnel --url http://localhost:4173`
