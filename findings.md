# Findings

## 本机检索结果（2026-09-25）

- 未找到命名含 `化学 / 250 / 刷题 / 题库 / 题目 / 答案` 的正式题库文件。
- 桌面、文档、下载、OneDrive、微信文件均未发现手机 DeepSeek 答案解析原件。
- 找到的唯一真实化学题材料（微信 `Documents\xwechat_files\...\msg\file\2026-09\`）：
  - `Chapter 1a Introduction of Chemistry and Matter (Atom Questions).doc`（100 题，A–E 五选一，6 张内联图）
  - `课程资料-1a. Intro of Chem and Matt.pdf`（配套讲义）
- 环境：Node v22.22.2 / npm 10.9.7 / git 2.55 / Microsoft Word COM 可用（可解析 .doc）。
- 无现成相关项目；已在 `C:\Users\luoji\Desktop\chem-quiz` 新建独立目录。

## 关键发现

1. **.doc 文本导出会丢失上下标与内联图片**：图片变成 `U+0001`，化学式变成平文（`Al2O3`）。
   解析器需识别 `A)`+`U+0001` 的图片选项模式，否则会丢题（本次一度只解析出 99 题）。
2. **No Word 内联图为 5 个选项**的原题号 63，无法文本判读 → 标 `pending-image`。
3. 题目为英文、五选一，以概念题为主；未发现多选/填空/主观题。
4. 存在若干口径/命名争议题（46、73、96）与丢失上标题（24）。

## 存储与部署

- 学习记录：`localStorage["chemquiz.state.v1"]`，本机、不上传。
- 应用纯静态；`base: "./"` 支持子路径托管。
- 公网临时隧道：`cloudflared tunnel --url http://localhost:4173`（无账号，随时失效）。
- 局域网：`http://10.64.93.200:4173/`（同 Wi‑Fi）。

## 待用户确认（不阻塞样机）

1. 正式 250 题原件与手机 DeepSeek 答案解析原件的位置。
2. 学校是否有特殊计分、多选部分分、主观/计算题容差。
3. 长期部署方式与题库发布范围（当前按“无访问限制”处理）。
