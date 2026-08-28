# 02 — Data, Sync and Security

## 1. 固定技术边界

- 云端：Supabase Auth + Postgres。
- 登录：Email OTP。
- 本地：IndexedDB，优先使用 Dexie 或同等级轻量封装。
- 调度：维护状态良好的 TypeScript FSRS 实现，通过自定义 adapter 隔离。
- Service Worker 只缓存静态 App Shell，不保存个人学习状态。
- 用户私有数据以 `user_id = auth.uid()` 隔离。

---

## 2. Authentication

### AUTH-001 · P0 · Email OTP

登录流程：

```text
Email
→ 发送六位 OTP
→ 输入 OTP
→ 验证
→ 创建或恢复 Session
```

不实现密码登录。

### AUTH-002 · P0 · 必要状态

必须实现：

- 请求 OTP；
- 验证 OTP；
- resend；
- loading；
- error；
- Session 恢复；
- Auth state listener；
- Session 过期；
- 登出。

### AUTH-003 · P0 · 本地与云端 Session

启动时允许先读取本地 Session 信息和缓存页面，但远程 Session 验证不能阻塞 App Shell 和已缓存 Home 的首次显示。

远程验证失败时：

- 清楚提示 Session 失效；
- 不把旧账户数据展示给新账户；
- 不静默丢弃未同步 outbox。

---

## 3. 云端数据模型

表名可以调整，但必须保留以下关系。

### DATA-001 · P0 · 公共内容表

```text
modules
categories
words
word_senses
contexts
cards
```

推荐字段：

```text
modules
- id
- slug
- name
- active
- created_at

categories
- id
- module_id
- slug
- name
- sort_order
- active

words
- id
- lemma
- display_form
- ipa
- part_of_speech
- created_at

word_senses
- id
- word_id
- module_id
- category_id
- meaning_en
- meaning_zh
- usage_note
- created_at

contexts
- id
- word_sense_id
- context_sentence
- target_text
- plain_english_paraphrase
- sentence_translation_zh
- source_type
- source_title
- source_url
- doi
- pmid
- created_at

cards
- id
- word_sense_id
- context_id
- card_type
- active
- created_at
```

公共内容表：

- 已登录用户可读；
- 普通用户不可直接修改；
- 正式导入通过 migration、seed script 或受控服务端脚本完成。

### DATA-002 · P0 · 用户私有表

```text
profiles
daily_assignments
daily_review_assignments
review_events
review_states
user_settings
```

推荐字段：

```text
profiles
- user_id
- timezone
- created_at
- updated_at

daily_assignments
- id
- user_id
- module_id
- study_date
- card_id
- category_id
- position
- created_at

daily_review_assignments
- id
- user_id
- module_id
- study_date
- card_id
- position
- created_at

review_events
- event_id
- user_id
- card_id
- module_id
- rating
- reviewed_at
- device_id
- device_sequence
- base_revision
- applied
- conflict_reason
- created_at_server

review_states
- user_id
- card_id
- module_id
- scheduler_state_json
- due_at
- last_reviewed_at
- revision
- updated_at

user_settings
- user_id
- theme
- created_at
- updated_at
```

### DATA-003 · P0 · 约束和索引

至少需要：

- 所有主键和外键；
- 必要 `NOT NULL`；
- `review_events.event_id` 全局唯一；
- `review_states (user_id, card_id)` 唯一；
- `daily_assignments (user_id, module_id, study_date, card_id)` 唯一；
- `daily_review_assignments (user_id, module_id, study_date, card_id)` 唯一；
- assignment 的 position 在用户、模块和日期内唯一；
- `review_states (user_id, due_at)` 索引；
- `review_events (user_id, card_id, reviewed_at)` 索引；
- assignment 的用户、模块、日期组合索引。

---

## 4. Daily Assignment

### ASSIGN-001 · P0 · 固定 study_date

`study_date` 使用 profile 中保存的 IANA timezone，例如：

```text
America/Los_Angeles
Asia/Shanghai
```

不得仅使用设备当前 UTC 日期。

### ASSIGN-002 · P0 · 幂等

同一用户、模块和 `study_date` 首次生成后永久保持稳定。

以下操作不能改变当天卡片：

- 刷新；
- 重新登录；
- 关闭再打开；
- 换设备；
- 重复 API 调用。

### ASSIGN-003 · P0 · Research 配额

Research 每日严格：

```text
5 general_research
2 statistics_methodology
3 bioinformatics
```

### ASSIGN-004 · P0 · Medical 配额

Medical 每日 10 个新卡，并在滚动周期内尽量均衡分类。

### ASSIGN-005 · P0 · 不重复已学新卡

已经进入过用户新卡学习流程的 card，不得再次作为新卡分配。

Review 卡不占新卡名额。

### ASSIGN-006 · P0 · 并发安全

推荐使用数据库事务或安全 RPC：

```text
ensure_daily_assignment(module_id, study_date)
```

RPC 必须：

- 以 `auth.uid()` 作为当前用户；
- 不信任客户端传入其他 user_id；
- 使用唯一约束抵御两个设备同时创建；
- 固定安全 `search_path`；
- 具有确定性选择规则；
- 词库不足时返回结构化错误，不偷偷重复。

### ASSIGN-007 · P0 · 今日 Review 队列稳定

每日第一次构建 Review 队列后，将到期卡写入 `daily_review_assignments`。

这样 `Review total` 在同一天内保持可解释，不因不断产生 Again/relearning 步骤而无限变化。

---

## 5. Scheduler

### SCHED-001 · P0 · 成熟实现

使用维护状态良好的 FSRS TypeScript 库，并固定版本。

不得自行重写 FSRS 数学算法。

### SCHED-002 · P0 · Adapter

页面层只依赖项目内接口：

```ts
type ReviewRating = "again" | "hard" | "good" | "easy";

interface ReviewScheduler {
  preview(card: SchedulerCard, now: Date): RatingPreview;
  rate(card: SchedulerCard, rating: ReviewRating, now: Date): ReviewResult;
}
```

第三方库字段不能扩散到页面、路由和同步层。

### SCHED-003 · P0 · 当前状态

`review_states` 保存可快速查询的当前物化状态。

事件日志仍然是审计和重建依据，当前状态不是唯一不可恢复来源。

---

## 6. IndexedDB

### LOCAL-001 · P0 · 本地表

至少保存：

```text
cached_cards
cached_daily_assignments
cached_daily_review_assignments
local_review_events
local_review_states
sync_outbox
sync_metadata
daily_summary
local_profile
local_settings
```

### LOCAL-002 · P0 · 账户隔离

所有本地记录必须包含或隐式分区于 `user_id`。

账户 B 登录后不能看到账户 A 的：

- 卡片；
- 进度；
- assignment；
- Review state；
- outbox。

### LOCAL-003 · P0 · 安全升级

IndexedDB schema 必须有明确版本迁移。

禁止升级时无条件：

```text
deleteDatabase()
clear all tables
```

迁移失败必须可见并有测试。

### LOCAL-004 · P0 · 本地摘要

首页读取 `daily_summary`，不得每次扫描全部 Review history。

建议字段：

```text
user_id
module_id
study_date
new_completed
new_total
review_completed
review_total
total_learned
streak
pending_sync_count
updated_at
```

summary 是可重建缓存，不是唯一事实来源。

---

## 7. Local-first Review Event

### SYNC-001 · P0 · 评分事务

每次 Again / Hard / Good / Easy 必须在一个本地事务中：

1. 生成 UUID；
2. 写入 immutable local review event；
3. 更新 local review state；
4. 更新 daily summary；
5. 写入 outbox；
6. 提交事务后立即更新 UI。

网络请求不在这个本地事务的关键路径中。

### SYNC-002 · P0 · 事件字段

每个事件至少包含：

```text
event_id
user_id
card_id
module_id
rating
reviewed_at
device_id
device_sequence
base_revision
scheduler_before
scheduler_after
sync_status
```

### SYNC-003 · P0 · 幂等上传

同一 `event_id` 的重复上传只在云端存在一条记录。

网络超时后重试不能产生重复评分。

### SYNC-004 · P0 · Outbox

Outbox 状态至少包括：

```text
pending
syncing
synced
failed
```

上传失败时保留事件，采用有限退避重试。

不得因为错误清空整个 outbox。

### SYNC-005 · P0 · 同步触发

至少在以下时机触发：

- 登录成功；
- App 启动；
- `online` 事件；
- 页面获得焦点；
- 用户主动同步；
- 完成一批学习后。

必须有同步锁，避免同一客户端并发运行多个 sync loop。

### SYNC-006 · P0 · Push / Pull

推荐流程：

```text
1. 恢复本地账户和 IndexedDB。
2. Push pending outbox。
3. Pull remote assignments、review events 和 states。
4. 合并。
5. 更新 local state 和 summary。
6. 预取今日卡片。
```

同步失败不能阻止继续使用已缓存内容。

---

## 8. 多设备冲突

### SYNC-007 · P0 · 保留所有事件

两个设备对同一卡片产生离线事件时，不得简单删除其中一个事件。

所有合法 Review events 保留在云端审计日志中。

### SYNC-008 · P0 · Revision

每个 Review event 带 `base_revision`。

正常路径：

- base revision 与当前 state revision 一致；
- 事件应用；
- revision + 1。

不一致时标记冲突并触发该 card 的 reconciliation。

### SYNC-009 · P0 · 确定性 reconciliation

只对冲突 card 拉取必要事件，按以下稳定顺序排序：

```text
reviewed_at
→ device_id
→ device_sequence
→ event_id
```

使用同一 Scheduler adapter 从可用基准状态重放并生成 canonical state。

正常启动不得对所有历史卡片全量重放。

### SYNC-010 · P1 · 异常客户端时间

明显异常的 `reviewed_at` 应标记，必要时使用 server received time 参与保护性排序。

行为必须记录在 `docs/SYNC_PROTOCOL.md`，不得无声覆盖。

---

## 9. RLS 与密钥

### SEC-001 · P0 · 私有表 RLS

以下用户表全部启用 RLS：

```text
profiles
daily_assignments
daily_review_assignments
review_events
review_states
user_settings
```

用户只能访问 `auth.uid()` 对应记录。

### SEC-002 · P0 · 公共内容只读

普通已登录用户可读公共词库表，但不能在前端直接写入正式内容。

### SEC-003 · P0 · Review event 不可修改

普通用户可插入自己的 Review event，但不能 update 或 delete 已存在事件。

### SEC-004 · P0 · user_id 防篡改

Insert policy、RPC 和 server function 必须确保 user_id 来自 `auth.uid()`，不能信任前端任意传值。

### SEC-005 · P0 · 前端密钥

前端禁止出现：

```text
SUPABASE_SERVICE_ROLE_KEY
service_role
```

只允许公开客户端 URL 和 anon/publishable key。

`.env` 加入 `.gitignore`，提供 `.env.example`。

### SEC-006 · P0 · 日志

日志不得输出：

- OTP；
- access token；
- refresh token；
- 完整 Session；
- service role key。

### SEC-007 · P0 · 构建检查

QA 必须搜索源码和生产构建产物，确认不存在 service role 或私密环境变量。

### SEC-008 · P0 · 托管 Preview 私有访问边界

无 Supabase 的托管 Preview 不得作为匿名公开站点发布。Cloudflare Pages 发布前必须同时：

- 使用 Cloudflare Access 保护固定生产主机名和所有哈希/分支部署别名；
- 使用默认拒绝策略，身份必须同时是 `Cloudflare Account Member` 并匹配当前所有者的精确邮箱；
- 不配置 `Everyone`、`Bypass` 或匿名服务令牌规则；
- 应用会话时长不超过 24 小时；
- Preview 构建生成严格 CSP、`noindex`、`nosniff`、禁止嵌入、最小 Permissions Policy、无 referrer、子域 HSTS，并移除不需要的跨源资源共享响应头；
- CSP 的 `connect-src` 仅允许同源，防止本地学习数据被 Preview 代码发送到第三方；
- Service Worker 的导航 fallback 必须排除 `/cdn-cgi/`，不得截获 Access callback 或 logout；
- 上述 Preview-only 响应头不得进入正式 cloud 构建，后者仍需连接 Supabase；
- Vite build mode 与 `VITE_APP_MODE` 必须一致；不得生成带 Preview 本地 runtime 却缺少 Preview manifest/安全响应头的混合产物；
- 在线验收必须证明匿名请求在取得任何 App Shell、Service Worker 或静态资源前被 Access 拦截，并证明登录后的 App Shell 和离线 PWA 仍可用。

当前 owner-only 部署基线进一步收紧为：应用和策略会话均为 30 分钟；只启用 Cloudflare IdP 与 instant authentication；关闭 Cloudflare One Client authentication；开启 `HttpOnly`、Binding Cookie 与 `SameSite=Lax`；应用不显示在 App Launcher。所有者邮箱只保存在 Access 策略中，不写入仓库、前端构建或发布文档。

Access 保护的是网络入口，不是本机操作系统账户。已经在设备上缓存或安装的离线 App Shell，以及 IndexedDB 中的本地学习进度，仍由该 Mac 的用户会话和磁盘安全负责；不得把 Access 描述为远程撤销本地缓存。

---

## 10. 无真实 Supabase 凭据

### DATA-004 · P0 · 可继续开发

缺少真实凭据时仍必须完成：

- migrations；
- RLS；
- Auth adapter；
- Sync adapter；
- local demo mode；
- 数据层和 UI；
- 自动化测试；
- 配置文档。

Demo mode 必须与 production 明确分离，不得默认进入生产构建。

在用户明确要求、但尚无 Supabase 项目时，可以发布显式 `preview` 构建用于真实 HTTPS/PWA 安装体验。该模式必须同时满足：

- 仅由 `VITE_APP_MODE=preview` 的专用构建启用；
- 使用与开发 Demo、云端账户都不同的 IndexedDB namespace；
- 所有页面常驻显示“数据仅保存在当前浏览器、未连接登录与跨设备同步”；
- 状态只能描述为本机保存，不得显示 `Synced` 或提供无效的 `Sync now`；
- 不需要或包含任何 Supabase 配置；
- 托管时满足 SEC-008 的双主机名 Access 覆盖和 Preview-only 安全响应头；
- 不得称为完整 production/cloud release，正式 cloud 构建继续 fail closed。

最终报告必须把真实跨设备场景标记为：

```text
Implemented but not verified on two real clients
```

除非确实执行过真实验证。
