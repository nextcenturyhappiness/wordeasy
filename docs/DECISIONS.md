# Decisions

本文件记录已经锁定的产品和技术决策，以及后续冲突裁决。

## 已锁定决策

### DEC-001 · PWA 而非两个原生项目

使用一套 React + TypeScript 代码实现 installable PWA，主要支持 Android Chrome 和 macOS Chrome。

### DEC-002 · Context-first

学习对象是 word sense + context card，不是孤立单词翻译。

### DEC-003 · Supabase Email OTP

使用 Email OTP，不实现密码系统和复杂用户管理。

### DEC-004 · Local-first

评分先写 IndexedDB，UI 立即更新，云端同步在后台进行。

### DEC-005 · Immutable Review Event

Review event 使用唯一 UUID，不可变，重试幂等。

### DEC-006 · Stable Daily Assignment

当日 assignment 首次生成后稳定，跨刷新和设备一致。

### DEC-007 · FSRS Adapter

使用成熟 FSRS TypeScript 实现，通过项目内 adapter 隔离。

### DEC-008 · Service Worker 边界

Service Worker 只缓存静态 App Shell；个人学习数据进入 IndexedDB。

### DEC-009 · 启动不等待云端

已有本地缓存时，Home 必须先显示，Supabase 同步后台进行。

### DEC-010 · 不使用远程字体

MVP 使用系统字体栈。

### DEC-011 · MVP 范围控制

不实现 Add Word、搜索、收藏、统计、AI、全文导入、Anki 和社交功能，也不创建占位入口。

### DEC-012 · Public content / private progress

正式词库为公共只读内容；学习进度、assignment、events、states 和 settings 为用户私有数据。

### DEC-013 · Assignment shortage 原子化

Date: 2026-08-26
Status: Accepted
Related requirements: RES-001, RES-003, MED-001, ASSIGN-003–006
Decision: 任一必需分类不足时，当日该模块的新卡 assignment 整组不创建；返回并冻结结构化 shortage。不得部分分配、跨分类补足或重复旧卡。
Reason: 只有 all-or-nothing 才能同时保持 Research 5+2+3、Medical 10 和同日稳定。

### DEC-014 · Review 日队列截止点

Date: 2026-08-26
Status: Accepted
Related requirements: ASSIGN-001, ASSIGN-007, CORE-006
Decision: 第一次构建某日 Review 队列时，纳入该 profile timezone 下次本地午夜前到期的卡；即使为零也写入 assignment set 并冻结。
Reason: Review total 在同一 study_date 内稳定，同时符合按学习日组织复习的产品模型。

### DEC-015 · Immutable event 与应用状态分离

Date: 2026-08-26
Status: Accepted
Related requirements: DATA-002, SYNC-002/007/008, SEC-003
Decision: `review_events` 只保存不可变事实；`applied`、冲突原因、canonical revision 等可变处理结果进入 `review_event_applications`。
Reason: 推荐字段中的处理状态会变化，直接更新 event 会与不可变审计日志和禁止 UPDATE 冲突。

### DEC-016 · FSRS 版本和服务器边界

Date: 2026-08-26
Status: Accepted
Related requirements: SCHED-001–003, SYNC-008/009
Decision: 精确锁定维护中的 TypeScript FSRS 库，通过 adapter 计算并在 event/state 记录实现与配置版本。Postgres 负责身份、幂等、顺序和 revision CAS，不在 SQL 中重写 FSRS 数学。升级必须显式迁移，不追溯静默改写历史。
Reason: 保持成熟算法、可重放性和清晰信任边界。

### DEC-017 · Timezone 变更

Date: 2026-08-26
Status: Accepted
Related requirements: ASSIGN-001/002, CORE-009, UI-013
Decision: timezone 修改只影响修改后首次请求计算出的 study_date；已经生成的 assignment set 永不改写或移动。所有 assignment、event 和 summary 保留其原 study_date 与 timezone 证据。
Reason: 防止设置变更破坏幂等 assignment 和审计历史。

### DEC-018 · 内容身份和来源

Date: 2026-08-26
Status: Accepted
Related requirements: CORE-002, CONTENT-003/004/009/010
Decision: authoring record 使用稳定 human-readable key，并由固定 namespace 生成 word/sense/context/card UUIDv5。首批 60 卡全部为 `original_example`，真实来源字段为空。
Reason: 同时支持规范化实体、稳定导入、可靠去重和不虚构来源。

### DEC-019 · Demo mode 不得静默进入生产

Date: 2026-08-26
Status: Accepted
Related requirements: DATA-004, AUTH-003, SEC-005
Decision: Demo 使用显式 `dev:demo` mode 和独立 IndexedDB namespace；production 缺少 Supabase 公开配置时显示配置错误，不自动回退 Demo。
Reason: 防止演示数据被误认为真实云端数据或污染生产账户边界。

### DEC-020 · MVP 托管目标

Date: 2026-08-26
Status: Accepted
Related requirements: SCOPE-001, PWA-001/002, CODEX_START_PROMPT final delivery
Decision: Web/PWA 产物以 Cloudflare Pages-compatible SPA 为部署目标；Supabase 继续承担 Auth 与 Postgres。
Reason: 启动提示明确要求最终报告 Cloudflare Pages 部署，并与单代码库 PWA 架构一致。

## 新决策模板

```text
### DEC-XXX · 标题

Date:
Status: Proposed | Accepted | Superseded
Related requirements:
Context:
Decision:
Reason:
Alternatives rejected:
Consequences:
Tests/docs affected:
```
