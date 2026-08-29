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

### DEC-021 · Canonical FSRS 的可信执行边界

Date: 2026-08-26
Status: Accepted
Related requirements: SCHED-003, SYNC-007–009, SEC-004/005
Context: 第一轮工程审查发现浏览器可向旧 RPC 提交任意 canonical scheduler state；revision CAS 只能防并发覆盖，不能证明状态由事件确定性重放得到。
Decision: 浏览器提交的 `scheduler_before` / `scheduler_after` 只作为不可变审计证据。发生冲突时，由 Supabase Edge Function 在服务端凭据边界内取得可信事件 bundle，以固定版本 `ts-fsrs` 确定性重放，并调用仅服务端可执行的 event-set-hash + revision CAS RPC。普通 `authenticated` 角色不得直接执行可信 bundle 或 canonical commit RPC。
Reason: 保留成熟 TypeScript FSRS 实现和可重放性，同时不在 Postgres 中重写算法，也不信任可修改客户端生成 canonical state。
Alternatives rejected: 浏览器直接提交 canonical state；在 SQL 中重写 FSRS 数学；丢弃冲突事件。
Consequences: canonical state 使用独立 `state_epoch + change_sequence` 游标；pending replay 完成前不能首次冻结 Review 日队列。部署必须协调发布 `review-sync`、hardening migration 和匹配前端；旧客户端同步 fail closed 并保留本地 outbox。服务端密钥只存在于 Function 环境；没有真实 Supabase 时只能静态和适配器验证，不能声称 live reconciliation 已通过。
Tests/docs affected: `20260826000600_sync_hardening.sql`, `supabase/functions/review-sync`, cloud/sync tests, `docs/SYNC_PROTOCOL.md`, `docs/TRACEABILITY.md`.

### DEC-022 · 有界 Outbox 与 state-cursor 恢复

Date: 2026-08-26
Status: Accepted
Related requirements: LOCAL-003/004, SYNC-003/005/007/010, PERF-007/010/012, TEST-010/019/031
Context: 工程二审发现两条相关风险：active outbox 卡片的 canonical state 被跳过后，state cursor 仍可前进；另外 eligible/active outbox 曾被整组物化，原 10,000-event benchmark 只有两条 active row，不能证明长期有界。
Decision: IndexedDB 升级为 v3，`sync_outbox` 直接保存 `cardId`，并增加 claim due-time、syncing lease-time、module/status、card/status 复合索引。每个 active status 每次最多读取 batch limit，最终 claim 不超过 limit。任何因 active outbox 而跳过的 canonical state，都必须在同一 Dexie 事务中加入 durable pending-reconciliation 集合后才提交新 cursor；pending ID 只有在无 active outbox 且 canonical state 本地提交成功后才删除。
Reason: cursor 只在恢复工作已持久化后前进，才能避免 duplicate acknowledgement 后永久保留 tentative state；card-scoped 精确索引才能把正常同步的内存和查询工作限制在 batch/card 范围内。
Alternatives rejected: 不推进整个 state cursor；全量扫描 active outbox 后内存过滤；把尚未实际跳过 state 的所有 epoch-reset pending card 立即送去 Edge reconcile。
Consequences: v2→v3 migration 通过 immutable local event 回填并校验 `cardId`；找不到或不匹配 event 时 version-change 事务中止并保留旧库。迁移与 epoch reset 仍可能一次性线性扫描既有 row，但正常 claim、计数和 card conflict 路径有界。真实双客户端收敛仍为外部 Not verified。
Tests/docs affected: `learningDatabase.ts`, `dexieSyncStore.ts`, v3 migration rollback/boundary/restart tests, 10,000-active-outbox benchmark, `docs/SYNC_PROTOCOL.md`, `docs/TRACEABILITY.md`.

### DEC-023 · 无 Supabase 时的显式托管预览

Date: 2026-08-27
Status: Accepted
Related requirements: DATA-004, AUTH-003, SEC-005, PWA-001/002/003, TEST-025/026
Context: 用户已有 Cloudflare 账户并要求立即部署，但尚未创建 Supabase。原 cloud production 在缺少公开配置时按 DEC-019 fail closed，开发 Demo 又不能作为生产构建发布。
Decision: 增加专用 `preview` build/runtime，使用受控 20-card 本地数据、独立 `wordeasy:preview:*` IndexedDB namespace 和独立 Preview manifest。页面常驻说明数据只保存在当前浏览器且没有登录、备份或跨设备同步；同步状态显示 `Saved on this device`。Preview 只能在显式 preview build 中创建，不配置 Supabase，也不得让默认 cloud production 回退本地数据。
Reason: 允许在真实 HTTPS 和安装式 PWA 上验证当前学习体验，同时保持云端账户、安全边界和发布状态诚实。
Alternatives rejected: 解除 production Demo 禁令；用 Cloudflare D1 临时替换已锁定的 Supabase 架构；把配置错误页发布为可体验产品。
Consequences: Preview 只有 20 张受控卡片；清除站点数据、使用其他浏览器或设备会失去进度；正式 Supabase 版应使用独立 Cloudflare 项目/origin。Preview build、PWA、secret、评分刷新、直达路由和离线重启必须独立验证。
Tests/docs affected: runtime/UI tests, `playwright.preview.config.ts`, `previewDeployment.spec.ts`, preview build/PWA/secret checks, `README.md`, `docs/TRACEABILITY.md`, `docs/RELEASE_VERIFICATION.md`.

### DEC-024 · 托管 Preview 默认私有

Date: 2026-08-28
Status: Accepted
Related requirements: DATA-004, SEC-008, PWA-002/003, TEST-041
Context: Cloudflare Pages 的 `pages.dev` 固定入口和哈希部署别名默认公开。用户明确要求 Preview 只能由本人账号登录访问，并要求把网络安全作为发布硬门槛。
Decision: Preview 发布前创建两个 Cloudflare Access 保护目标：`wordeasy-preview.pages.dev` 与 `*.wordeasy-preview.pages.dev`。两者复用默认拒绝的 owner-only Allow 策略：Include 为当前 Cloudflare Account Member，Require 为当前所有者的精确邮箱；应用和策略会话均为 30 分钟。仅启用 Cloudflare IdP 和 instant authentication，关闭 Cloudflare One Client authentication；启用 `HttpOnly`、Binding Cookie、`SameSite=Lax`，并从 App Launcher 隐藏。不得配置 Everyone、Bypass、Service Auth 或其他更宽的 Allow 策略。Preview 构建单独生成严格 CSP、同源 `connect-src`、noindex、HSTS、nosniff、frame denial、Permissions Policy、COOP/CORP 与 no-referrer；Service Worker 不得把 `/cdn-cgi/` Access callback/logout 当作 SPA 导航；默认 cloud build 不生成该 `_headers`。Vite mode 与 `VITE_APP_MODE` 必须匹配，任何 Preview runtime/非 Preview Vite mode 或 Preview Vite mode/非 Preview runtime 组合均在构建配置阶段失败。
Reason: 只保护固定入口会留下原子部署 URL 的旁路；只靠链接保密或 noindex 不是访问控制。Access 在静态内容与 Service Worker 之前执行身份验证，Preview-only CSP 再限制登录后页面的浏览器能力和网络外连。
Alternatives rejected: 公开发布后只隐藏 URL；只添加 noindex；只保护固定 `pages.dev` 主机；把客户端口令写入 JavaScript；用 Preview 的 CSP 阻断未来 Supabase cloud build。
Consequences: 用户必须先通过 Cloudflare Access 登录；新增 Cloudflare 账户成员不会自动获得权限，只有同时匹配精确 owner identity 才可访问。若所有者邮箱变更，必须先更新 Access 策略以免锁定。Access 无法远程撤销已安装设备上的离线 App Shell 或 IndexedDB，本机磁盘/用户会话安全仍是独立边界。在线发布必须验证匿名固定入口、哈希别名和静态资源均被拦截。
Tests/docs affected: Preview build checker, Cloudflare online acceptance, `README.md`, `docs/02_DATA_SYNC_SECURITY.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`, `docs/RELEASE_VERIFICATION.md`.

### DEC-025 · PWA 核心增加 macOS 个人版 Tauri DMG

Date: 2026-08-28
Status: Accepted
Related requirements: SCOPE-001/002, PWA-001–004, DESKTOP-001–004, PERF-006/011, TEST-027/042
Context: 用户明确要求不再把私有 Preview 当成产品交付，而是生成个人使用的 macOS App，同时保留 Android 手机运行能力。原 SCOPE-002 将所有原生包装列为 Deferred，与本次明确授权冲突。
Decision: 同一 React / TypeScript / Vite 学习前端保留 installable Android PWA，并新增 Tauri 2 macOS 外壳。正式本地 Web target 使用 `standalone` mode，Mac 使用 `desktop` mode；二者加载完整 60-card canonical seed 的 deferred chunk，分别使用稳定独立的 IndexedDB namespace。桌面 target 不生成 Service Worker，并以 `com.nextcenturyhappiness.wordeasy`、严格 CSP、零 capability、无 IPC command、无远程网络和导航拒绝进行 ad-hoc 个人版 `.app` / `.dmg` 打包。
Reason: Tauri 只承担 Mac 安装和窗口生命周期，不复制前端或学习内核；Android 仍获得标准 PWA 安装和离线能力。显式 mode、独立数据 identity 和可见本地边界避免把 Preview、云端同步或跨设备能力伪装成正式可用功能。
Alternatives rejected: 把 20-card Preview 直接改名打包；为 Android 和 macOS 分别重写原生应用；把 Tauri Service Worker 与 bundle 更新同时启用；在没有 Supabase 时伪造账号和跨设备同步。
Consequences: SCOPE-002 只继续 Deferred Android APK/AAB、应用商店及 Developer ID 签名/Apple 公证。Mac、Android、旧 Preview 的本地进度暂不互通；修改 bundle identifier、WebView scheme 或本地 namespace 会表现为新数据空间。ad-hoc DMG 只作为本人使用产物，不代表可无提示分发给其他 Mac 用户。
Tests/docs affected: Tauri config/Rust guard, local runtime/seed, desktop/standalone build checks and E2E, `README.md`, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`, `docs/RELEASE_VERIFICATION.md`.

### DEC-026 · 正式 standalone PWA 继承 owner-only 托管边界

Date: 2026-08-29
Status: Accepted
Related requirements: DATA-004, SEC-008, PWA-001–003, TEST-041; DEC-024/025
Context: 用户要求 Android 继续运行，但不再把 20-card 私有 Preview 作为产品交付。正式 `standalone` 已有完整 60-card 内容、独立稳定 namespace 和本地离线能力，现有 Cloudflare Pages 项目则已配置固定主机与通配部署别名的 owner-only Access。
Decision: 使用验证通过的 `dist-standalone` 替换现有 Pages 项目的 production 内容，同时保留 `wordeasy-preview.pages.dev` 这一历史项目主机名和原有两层 Access 覆盖。20-card Preview 仅保留在部署历史；当前安装名称、manifest、runtime 和数据 namespace 均为正式 `wordeasy` standalone。正式本地数据 PWA 继承 DEC-024 的默认拒绝 Access、local-only `_headers`、同源 CSP、`/cdn-cgi/` 排除和匿名静态资源拦截要求。
Reason: 在不引入假账号或假同步的情况下提供真实 Android PWA 安装目标，同时避免新建并重新配置一套容易出现哈希域名旁路的安全边界。历史 URL 中包含 `preview` 不应决定当前 artifact 的产品身份。
Alternatives rejected: 继续把 20-card Preview 当产品；公开 standalone 后只隐藏 URL；只保护固定域名；在无 Supabase 时增加客户端口令；为改名另建未完成 Access 验证的新项目。
Consequences: README 和发布账本必须明确 URL 是历史项目名而当前内容是正式 60-card PWA。Access 仍不能远程撤销已缓存的离线 App Shell；Android 与 Mac 进度仍不互通。浏览器仿真和线上部署成功不能替代真实 Android 安装，PWA-002/TEST-027 继续 Not verified。
Tests/docs affected: standalone build/PWA/E2E checks, Cloudflare deployment and anonymous Access checks, `README.md`, `docs/02_DATA_SYNC_SECURITY.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`, `docs/RELEASE_VERIFICATION.md`.

### DEC-027 · 正式个人版按需加载内容并冻结本地 Review 队列

Date: 2026-08-29
Status: Accepted
Related requirements: CORE-006, ASSIGN-007, SCHED-001/002, PERF-005/006, TEST-033; DEC-025
Context: 第一轮正式 runtime 审查发现 standalone/desktop 复用了 Demo 的永久空 Review 策略，并在 Home 前静态加载完整 60-card catalog 和 FSRS。旧构建已可能在当日写入无版本的空 Review set。
Decision: 正式本地 target 使用独立 `PersonalLearningRepository`。Home render-critical path 只打开 IndexedDB、刷新按日 summary，并在无 catalog 时生成轻量 New 配额；Home 可见绘制完成后再通过可取消的 idle callback 预取 Today/Study route 与未完成卡最多的模块今日卡片。60-card catalog 在该 idle 预取或首次显式 Today/Study 访问时动态加载、按版本原子替换可重建缓存，FSRS 只在首次评分时动态加载。每天先固定 New assignment，再按 profile IANA timezone 将本学习日结束前到期且不属于当日 New 的 card 以 `dueAt + cardId` 稳定排序并冻结 Review set；零卡也冻结。`personal-review-queues-v1` 只在首次升级时删除旧版无 row 的空 set 并立即写入 user-scoped migration marker，之后任何同日空/非空集合都不得因新状态而改变。
Reason: Review total 必须可解释且 Again/relearning 不能动态扩大当日队列；完整词库和调度算法也不能位于首屏关键路径。显式一次性迁移能够修复旧正式构建，而不会把合法冻结的零队列误判为坏数据。
Alternatives rejected: 继续复用 `DemoLearningRepository.ensureEmptyReviewSet`；根据“当前有 due state”无版本重建同日空集合；在 Home 初始化前 bulkPut 60 卡并实例化 FSRS；用自写调度算法替代固定版本 `ts-fsrs`。
Consequences: fresh Home 首次绘制时 New 显示 0/10 且 IndexedDB 尚无 card row；浏览器空闲后或用户先进入 Today/Study 时缓存严格 30+30，并记录 `canonical-60-v1`。旧/残留 catalog row 会在首次正式加载时被替换，但 review event/state/outbox 等用户学习记录不被删除。长期开启应用跨本地午夜时会构建新日 summary/queues。Mac、Android 与旧 Preview 的 namespace 和进度仍彼此独立。
Tests/docs affected: personal repository/DST/runtime tests, Home idle-prefetch unit/component tests, standalone E2E, build import-graph checks, `docs/TRACEABILITY.md`, `docs/RELEASE_VERIFICATION.md`.

### DEC-028 · 对外产品名统一为 wordeasy 并保持数据身份稳定

Date: 2026-08-29
Status: Accepted
Related requirements: DATA-004, LOCAL-002/003, PWA-001/002, DESKTOP-002/004, TEST-025/041/042
Context: 用户明确要求把产品名改为小写 `wordeasy`，并确认部署当前正式 standalone PWA。现有 Mac 与浏览器本地学习进度依赖已经发布的数据 namespace、WebView identity 和 bundle identifier。
Decision: HTML title、应用内 wordmark、PWA `name`/`short_name`、macOS product/window/App/DMG 名称、安装说明和发布文档统一使用小写 `wordeasy`。保留 `com.nextcenturyhappiness.wordeasy`、`wordeasy:standalone:v1`、`desktop:v1`、既有 `article-english:*` 兼容性存储键、Cloudflare Pages 项目主机名和两层 owner-only Access 应用；这些内部身份不得因品牌改名而迁移或清空。
Reason: 用户看到和安装的是一致的 `wordeasy`，同时已有 IndexedDB、主题、Session、设备 identity、Access 策略和 Mac WebView 数据仍可连续使用。
Alternatives rejected: 全局字符串替换并创建新本地数据空间；为改名新建未验证 Access 的 Cloudflare 项目；修改 bundle identifier 导致 macOS 把应用视为另一产品。
Consequences: 源码中为兼容性保留的历史内部 key 或测试 hook 不是对外品牌；删除或迁移它们需要单独的版本化数据迁移。历史 Cloudflare URL 仍含 `preview`，但当前安装 manifest、UI 和正式产物名均为 `wordeasy`。
Tests/docs affected: manifest/build assertions, AppShell/E2E brand assertions, Tauri artifact verification, `README.md`, `docs/01_PRODUCT_CORE.md`, `docs/TRACEABILITY.md`, `docs/RELEASE_VERIFICATION.md`.

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
