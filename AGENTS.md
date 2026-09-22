# AGENTS.md

## 1. 项目目标

本仓库实现一个个人长期使用的 **Research English + Medical English + 必备医学英语** 跨平台 PWA。

三个顶层模块必须并存，不得互相替换或删除：

```text
research_english
medical_english
essential_medical   # 显示名「必备医学英语」
```

核心学习目标不是记忆孤立单词的中文翻译，而是理解单词在科研论文、医学文章、英文教材、指南和临床资料中的具体语境含义。

任何实现不得偏离以下核心模型：

```text
Context Card
= word + domain-specific sense + article/medical context
```

## 2. 需求来源

不要依赖聊天记忆判断产品需求。

强制阅读顺序：

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
任务相关需求文件（按该索引的阅读矩阵）
docs/DECISIONS.md          # 读到最新 Accepted 条目，当前至 DEC-059
docs/TRACEABILITY.md
```

当前有效需求文件是唯一执行依据。`docs/` 与本文件或 README 冲突时，以 `docs/` 为准。发生冲突时：

1. 不得自行静默解释。
2. 在 `docs/DECISIONS.md` 记录冲突、裁决和理由。
3. 更新 `docs/TRACEABILITY.md`。

只做最小正确改动。不要把 Deferred 功能（Add Word、独立全局搜索页、AI、Anki、统计看板、社交等，见 SCOPE-002）重新加回来。

## 3. 永久工程规则

- 使用 React、TypeScript strict mode、Vite 和 installable PWA。
- 云端使用 Supabase Auth + Postgres。
- 本地学习数据使用 IndexedDB；Service Worker 不得代替本地数据库。
- 所有数据库结构变更必须通过 SQL migration。
- 所有用户私有表必须启用 RLS。
- 前端禁止使用或暴露 Supabase `service_role` key。
- 每次学习评分必须先本地持久化。hosted cloud 目标再异步同步云端。个人 Mac 与 standalone 手机只保存在本机，两台设备进度独立，不得把 Sync 加回 Mac↔手机（DEC-059）。
- Review event 必须不可变、具有全局唯一 UUID，并支持幂等重试。
- 同一台设备上，同一天的 daily assignment 必须稳定，刷新不能改变。Mac 与手机不共享当日队列。
- Research English 每天严格分配 5 + 2 + 3 个新词。
- Medical English 每天严格分配 7 词根构词 + 3 病历用语（合计仍是 10；不是笼统的 10，也不是滚动分类平衡配额）。
- 必备医学英语（`essential_medical`）每天分配 10 个 `core` 新词。
- New 与 Review 必须分开计算。
- 首页不得等待 Supabase 网络请求后才首次显示。
- 完整词库不得打入首屏 JavaScript bundle。
- 不使用远程字体作为首屏依赖。
- 首页本地 Context Card 检索已授权（DEC-032 / DEC-039 / DEC-042），不是 Deferred。个人 Mac（`VITE_APP_MODE=desktop`）与 standalone 手机都走本地 `PersonalLearningRepository`：约 900 张目录、DEC-055 模糊检索、DEC-057 本地 New 资格、DEC-058 已 Reveal 查阅。Mac IndexedDB 是 `wordeasy:desktop:v1:local-user`，不登录、不同步（DEC-059）。hosted cloud / PWA 仍为子串匹配 + 当日缓存，并且只是可选/历史目标。不得把该检索做成独立 Search 页、公共词典或 Add Word。
- 不实现需求中明确标记为 Deferred 的功能。
- 不得声称未实际运行或未实际验证的场景已经通过。
- 不得删除用户已有未提交修改，不得执行 destructive reset。

## 4. 多 Agent 规则

- Root Coordinator 负责计划、文件所有权、集成、裁决和最终交付。
- Read-heavy 的探索、测试分析和审查可以并行。
- 可能修改同一文件的 Agent 不得并行写入。
- 如支持独立 worktree，写代码 Agent 使用独立 worktree。
- 每个 Subagent 必须收到：
  - 需要读取的文件；
  - 负责的 Requirement IDs；
  - 可以修改的目录；
  - 禁止修改的共享文件；
  - 必须运行的测试；
  - 固定返回格式。
- 两位 Reviewer 第一轮必须只读，并且不得读取对方第一轮报告。
- Subagent 返回压缩总结，不返回大段原始日志。

## 5. 质量规则

每个里程碑结束前至少运行与改动相关的：

```text
format check
lint
typecheck
unit tests
component/integration tests
production build
```

发布前必须运行 `docs/05_ACCEPTANCE_TESTS.md` 定义的完整验证。

任何 P0 需求只有在同时满足以下条件后才能标记为 Done：

1. 有实现位置；
2. 有自动测试，或明确记录的手工验收；
3. 已更新 `docs/TRACEABILITY.md`；
4. 不存在未解释的 BLOCKER 或 HIGH 问题。
