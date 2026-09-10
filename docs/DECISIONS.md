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

不实现 Add Word、独立全局搜索页、收藏、统计、AI、全文导入、Anki 和社交功能，也不创建占位入口。首页本地 Context Card 检索由 DEC-032 / DEC-039 授权，不恢复公共词典或 Add Word。

### DEC-012 · Public content / private progress

正式词库为公共只读内容；学习进度、assignment、events、states 和 settings 为用户私有数据。

### DEC-013 · Assignment shortage 原子化

Date: 2026-08-26
Status: Accepted — empty-shortage freeze narrowed by DEC-048 when catalog later fills the quota
Related requirements: RES-001, RES-003, MED-001, ASSIGN-003–006
Decision: 任一必需分类不足时，当日该模块的新卡 assignment 整组不创建；返回并冻结结构化 shortage。不得部分分配、跨分类补足或重复旧卡。词库后来补足时，空 shortage set 可由 DEC-048 替换为 ready set。
Reason: 只有 all-or-nothing 才能同时保持 Research 5+2+3、Medical 7+3（现为 7 词根 + 3 病历）和同日稳定。

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

### DEC-029 · 视觉系统改为现代产品界面

Date: 2026-08-31
Status: Accepted
Related requirements: UI-004, UI-013, UI-014, PERF-001, A11Y-001
Context: 产品所有者明确要求去掉当前奶油底 + 墨绿强调 + Georgia 语境句的教材/学术期刊观感，把 wordeasy 重绘为现代、干净的学习产品界面。UI-004 原本参考 Notion / Linear / 阅读器，但实现落成了期刊风。
Decision: 使用 CSS tokens + 全局样式完成视觉重构，不引入设计系统包。浅色近白中性表面、深色近黑石板、单一锐利靛蓝点缀；Context Card 作为视觉中心（词 + 语境义 + 句子），减少卡片 chrome 与灰盒堆叠。继续使用系统/UI 字体栈，不把远程字体作为首屏依赖。不改学习行为、调度、同步、鉴权、卡片内容或信息架构。PWA `theme_color` / `background_color` 与 canvas 对齐。
Reason: 所有者指定的产品方向，同时仍满足 UI-004 的克制阅读定位和 PERF-001 / UI-014 的技术约束。
Alternatives rejected: 保留墨绿教材调色只微调间距；引入 UI framework 或远程字体；把词库检索、统计看板等 Deferred 功能塞进这次视觉改版。
Consequences: 旧奶油/墨绿 token 不再使用。Light/Dark 都按产品界面而非期刊风验收。图标源 SVG 随品牌色更新，已安装 PWA 的旧图标缓存需等资源更新。
Tests/docs affected: `src/styles/tokens.css`, `src/styles/global.css`, theme/PWA colors, Context Card 表现层 class，`docs/01_PRODUCT_CORE.md` UI-004, `docs/TRACEABILITY.md`.

### DEC-030 · 个人 Mac 版改用与浏览器相同的云端学习 runtime

Date: 2026-09-01
Status: Accepted
Related requirements: DESKTOP-003/004, AUTH-001–003, SYNC-001/005, SEC-005, PERF-002/003, TEST-042; DEC-019/025
Context: 所有者删除了仍使用改版前 UI 且仅本地保存的旧 macOS `.app`，并要求新的 Tauri Mac 应用使用 main 上的现代 UI，以及他们刚在浏览器里用过的同一套 Supabase Email OTP 与自动同步。当时有效的 DESKTOP-003 禁止桌面 build 包含 Supabase 配置或远程 API 请求，与这次明确授权冲突。
Decision: 保留 `desktop` Vite/app mode 作为 Mac 包装身份（不生成 Service Worker、Web Manifest、Workbox 或 Cloudflare `_headers`），但启动路径改为与 `npm run dev:cloud` 相同的云端学习 runtime。客户端只读取 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`，来源与 cloud web build 相同：本地 `.env` / `.env.local` / `.env.production` 与 CI secrets。不得把 publishable key 写入 git，不得包含 `service_role`。Tauri 继续零 capability、无 shell/fs/http/dialog/updater plugin、无 IPC command、ad-hoc 个人签名。CSP 与导航默认拒绝，仅放行本地 WebView origin 与本项目 Supabase origin `https://kksllqgtjtfxfnknlrfn.supabase.co` 及其 `wss`。学习仍 local-first：评分先写 IndexedDB，同步失败不得阻塞。界面常驻说明这是个人 Mac 版、与浏览器同一云端账户，进度先保存在本机（该常驻横幅条款由 DEC-031 取代）。旧的 `desktop:v1` 本地-only identity 随被删除的旧 App 一起退役；新 App 使用 `article-english:cloud:${userId}`。
Reason: 所有者指定的个人交付是“现代 UI + 已在用的云端账户”，而不是再做一个无法登录、无法同步的本地外壳。显式裁决 DESKTOP-003/004，避免静默解释旧的禁网条款。
Alternatives rejected: 继续发布本地-only desktop；把 publishable key 写入仓库或 `.env.desktop`；为桌面单独复制一套学习内核；放开任意远程 origin 或启用 Tauri 网络/文件系统 plugin。
Consequences: Android standalone PWA 仍是本地独立进度，不得称为已与 Mac 同步。缺少公开 Supabase 配置时 desktop 构建 fail closed，不回退 Demo 或 `desktop:v1`。Linux CI 不能生成 Apple Silicon `.dmg`；真实 OTP、跨设备收敛和当前-App 退出重开仍需在 Apple Silicon 上验收。DEC-025 中“无远程网络 / 不包含 Supabase”的桌面条款由本决策取代；bundle identifier、ad-hoc 签名和零 plugin 边界继续有效。
Tests/docs affected: `src-tauri` CSP/navigation, desktop Vite env, `src/main.tsx`, desktop-build checker, Cargo navigation tests, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`, `README.md`.

### DEC-031 · 个人 Mac 版不显示常驻 environment banner

Date: 2026-09-01
Status: Accepted
Related requirements: DESKTOP-004, TEST-042; DEC-030
Context: 所有者打开新的 Tauri Mac 应用后，明确不希望看到常驻文案 “Personal Mac edition · Same cloud account as the browser. Progress is saved on this Mac first; sync happens in the background and never blocks learning.”
Decision: 从 desktop 启动路径删除传入 `ArticleEnglishApp` 的 `environmentNotice`。Mac 应用继续使用与浏览器相同的云端账户、Email OTP、IndexedDB-first 评分和后台同步；同步失败仍不得阻塞学习。产品合同是：desktop 使用同一云端账户且 local-first，但不显示常驻 environment banner。不引入 auto-updater。
Reason: 所有者指定的 UI 要求。云端能力和 local-first 已由 runtime 实现，不必再用横幅重复说明。
Alternatives rejected: 保留横幅但缩短文案；把同一句话改放到 Settings；为桌面增加 updater。
Consequences: DEC-030 中“界面常驻说明这是个人 Mac 版、与浏览器同一云端账户，进度先保存在本机”的条款由本决策取代。Preview 与 standalone 的 local-only notice 仍保留。
Tests/docs affected: `src/main.tsx`, `tests/ui/app-shell.test.tsx`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/TRACEABILITY.md`.

### DEC-032 · Home 为单一 Next Session + 本地 Context Card 检索

Date: 2026-09-01
Status: Accepted — Home visual hierarchy superseded by DEC-039; Next Session selection, peek, and local-search rules remain.
Related requirements: UI-001, UI-006, UI-015, CORE-005, SCOPE-002, PERF-003/005; DEC-011
Context: Home 原先并排两个同等 Continue，下方留下大块空白；写作时也没有办法检索自己学过的 Context Card。SCOPE-002 / DEC-011 将“Vocabulary 全局搜索”列为 Deferred，但所有者明确要求在本 PR 于首页加入个人词库检索，并把 Home 收成一个 Next Session，而不是 Anki 统计看板或 Duolingo 游戏化。
Decision:

1. Home 只有一个学习 CTA：Start next session。选择规则：取 New 剩余 + Review 剩余最多的模块；并列时取 Research English；该模块若仍有 Review 则先走 Review，否则走 New。按钮直接进入对应 Study 队列。模块 Continue 保留为次级入口，继续通往 Today，模块进度彼此隔离。该 CTA 的视觉主次由 DEC-039 取代：它不再是首页英雄。
2. 该 CTA 旁展示下一张到期 Context Card 的原句。句子只来自本地 assignment + `cached_cards` 的 peek，不触发 deferred catalog 加载，也不编造例句。无到期工作时显示平静空状态，而不是空白区域。
3. Home 提供本地 Context Card 检索，只检索当前账户 IndexedDB 中的 Context Cards（中文释义、lemma、语境句、搭配）。已学/已复习 sense 优先，但仍搜索本地词库。空查询不打开独立搜索页；无匹配只显示「还没有学过相关的词」。禁止公共词典、翻译 API、编造释义、Add Word、新的 Search 导航。搜索在首页的视觉权重由 DEC-039 提升为主表面。
4. SCOPE-002 的“Vocabulary 全局搜索页”和 Add Word 仍 Deferred。本决策只授权首页内的本地 Context Card 检索。
   Reason: 写作中需要的是自己学过的语境，而不是另一本词典；开始学习只需要一个下一步，而不是两个同等英雄按钮。
   Alternatives rejected: 两个并列 Continue 保持英雄位；新的 Search 主导航；远程词典/AI 释义；把完整词库打入 Home bundle；XP / 排行榜 / 每日目标镀铬。
   Consequences: UI-001 曾改为单一 Next Session 英雄；DEC-011 的“不实现搜索”收窄为不实现独立全局搜索。Home 首次绘制仍只读本地 summary。层级后续由 DEC-039 反转。

### DEC-033 · 学习日时区跟随计算机 IANA 时区

Date: 2026-09-01
Status: Accepted
Related requirements: CORE-009, ASSIGN-001, UI-013; DEC-017
Context: Settings 曾提供 “Study timezone” 卡片（IANA 文本框 + Save timezone），用于覆盖 profile timezone。所有者在 Mac 应用中学习，要求删除该编辑器，学习日跟随电脑当前时区。
Decision: 学习日、Home 问候日期和 streak 使用操作系统解析的 IANA timezone（`Intl.DateTimeFormat().resolvedOptions().timeZone`）；无法解析时回退 UTC。Settings 不再显示或编辑时区，也不替换为另一种时区选择器。`profiles.timezone` 与本地 profile 仍保留，供服务端 daily assignment RPC 与 CORE-009 证据；客户端在后台把 OS 时区写穿上去，与存储值不同时静默同步。启动时的静默检测不是用户发起的时区变更：已物化的当日 assignment 不得因检测而被改写或清空。DEC-017 对已生成 assignment set 的冻结仍然有效。
Reason: 用户在一台电脑上学习，时区应以该电脑为准，而不是再维护一个可手填的 profile 覆盖。
Alternatives rejected: 保留 Settings 时区编辑器；改成只读时区说明行；检测后重写当日队列。
Consequences: CORE-009 / ASSIGN-001 不再把 Settings 用户输入当作 study_date 来源。云端 profile timezone 以最后一次写穿的设备 OS 时区为准。
Tests/docs affected: `docs/01_PRODUCT_CORE.md`, `docs/02_DATA_SYNC_SECURITY.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`, Settings UI and study-date tests.

### DEC-034 · Home 搜索无 placeholder；macOS 图标使用 Apple inset

Date: 2026-09-01
Status: Accepted
Related requirements: UI-001, UI-015, PWA-001, DESKTOP-002; DEC-032
Context: Home 胶囊搜索框曾使用 placeholder「用中文搜学过的词」。所有者要求去掉该提示文案，只保留空输入与放大镜。同时 Launchpad 里 wordeasy 图标比系统 App 更大，因为 `icon-source.svg` 的圆角方块铺满整张画布，macOS 不再额外留边。
Decision:

1. 搜索框使用空 `placeholder=""`，不替换为另一句中文或英文提示。`<search>` / 输入的可访问名称保持 “Search learned Context Cards”。无匹配仍只显示「还没有学过相关的词」。检索范围与 DEC-032 不变。
2. 应用图标把整枚 glyph 缩放到 1024 画布的 824×824（每边 100px 透明边，约 80.5%），再由此 master 重生成 Tauri `icon.icns` / PNG 与共用同一 source 的 PWA 192/512。maskable 图标仍用满幅安全区稿，不套同一 inset。本条锁定的是 inset，不是白书图形；标记由 DEC-038 替换。

Reason: 搜索框不需要教学文案；macOS 槽位会原样显示整张 1024 图，必须在素材里留出系统级透明边。
Alternatives rejected: 改成英文 placeholder；重绘标记；把满幅方块裁成 squircle；只改 icns 不改 source。
Consequences: UI-001 线框不再写 placeholder 文案。Windows/Linux 与 PWA any-purpose 图标跟随同一 padded master。
Tests/docs affected: `LexiconSearch`, Home UI tests, `docs/01_PRODUCT_CORE.md`, `docs/TRACEABILITY.md`, `public/icons/icon-source.svg`, `src-tauri/icons/**`, PWA 192/512 PNGs.

### DEC-035 · Reveal 后语境原句钉在首屏；适用范围与句子来源用中文

Date: 2026-09-01
Status: Accepted — 「句子来源」heading superseded by DEC-047
Related requirements: CORE-004, UI-008, UI-009, CONTENT-007, TEST-002; DEC-002
Context: Mac 学习窗在 Reveal 后背面堆叠过高，`focus()` 把答案区滚进视口，语境原句（含高亮 target）被切到窗口上方。USAGE NOTE 是抽象英文，SOURCE 看不出是例句来源。所有者写科研/医学英文，需要知道这个词有多硬才用得诚实。
Decision:

1. Reveal 后把语境原句滚到学习窗顶部并 sticky 钉住；不得滚向释义或评分行。正面挖空已被 DEC-046 取代，背面高亮（UI-008）仍在。评分按钮可以在折页下方。
2. 背面第 7 层标题固定为「适用范围」；`usage_note` 对全部 60 张 seed 卡改为一两句中文使用强度说明，不改 lemma、sense、例句、搭配、IPA 或 FSRS。
3. 背面第 8 层标题为「句子来源」；`original_example` 显示「为本词表撰写的例句」。不编造 DOI 或其他引用。

Reason: 语境原句是 Context Card 的锚；用法说明要能指导写作，来源标题要名副其实。
Alternatives rejected: 自动滚到评分按钮；藏起原句；标题用「什么时候能用」「使用强度」或 USAGE NOTE。
Consequences: CORE-004 / UI-009 层级标题改为中文两项；CONTENT-007 覆盖 usage_note。本地 seed JSON 与生成的 SQL migration 必须同步。
Tests/docs affected: `ContextCard`, `StudyPage`, seed JSON/SQL, content validator, UI/content tests, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/04_CONTENT_SCHEMA.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`.

### DEC-036 · Reveal 后去掉语境提问，把 IPA 放到 sticky 原句区

Date: 2026-09-01
Status: Accepted
Related requirements: CORE-003, CORE-004, UI-008, UI-009, TEST-002; DEC-035
Context: Reveal 后学习窗仍显示 “What does the highlighted word mean in this context?”。所有者已经在看释义页，这句提问多余。音标有助于记忆，应出现在仍钉在首屏的原句附近。
Decision:

1. 正面提问已由 DEC-046 改为 “What does this word mean in this context?”；lemma 与完整原句在揭示前可见。既有正面 IPA/词性保持原样，不新增会泄露释义的字段。
2. Reveal 后不再显示 “What does the highlighted word mean…” 或等价提问。该位置改为 sticky 语境原句下的 IPA；词性可同行，写成 `/…/ · verb`。
3. 背面释义堆叠不再重复 IPA / part of speech 区块。Meaning、paraphrase、中文释义、完整句子翻译、collocations、适用范围、句子来源保留。DEC-035 的 sticky 原句、适用范围与句子来源标题不变。

Reason: 提问只服务于未揭示的正面；揭示后首屏应留给句子和读音。
Alternatives rejected: 保留提问只改文案；把 IPA 留在下方释义层；正面新藏 IPA。
Consequences: CORE-004 / UI-009 的稳定层级不再把 IPA 当作第 6 层独立标题。
Tests/docs affected: `ContextCard`, UI/E2E tests, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`.

### DEC-037 · Reveal 后 IPA 用系统 TTS 朗读 lemma

Date: 2026-09-01
Status: Accepted
Related requirements: CORE-004, UI-008, UI-009, UI-016, TEST-002, A11Y-001; DEC-036
Context: 所有者要在 Reveal 后点 IPA 听单词读音，但明确只要电脑系统语音。禁止把录音上传 GitHub/Supabase，禁止拉词典 MP3，禁止把 wav/mp3 放进仓库。
Decision:

1. Reveal 后 sticky 原句下的 `/…/ · verb` 行是按钮。点击用 `window.speechSynthesis` 朗读 **lemma**（与 IPA 对应的词典形）；lemma 为空时才用 displayForm。语言固定 `en-US`。若 `getVoices()` 列出 `localService` 的 English voice，优先 `en-US` 本地声。
2. 只在用户点击/轻触时朗读（满足 WKWebView / Chrome 手势要求）。正在朗读时再次点击：先 `cancel()` 再重新 `speak()`。
3. `speechSynthesis` 缺失或 `speak()` 抛错时不崩溃；显示一行 “Speech is not available on this device.” 或 “Speech could not start.”。异步 `utterance.onerror` 静默。
4. 未揭示正面的既有 IPA 仍是静态文本，不因此新增释义字段，也不自动播放。Reveal 本身不朗读。
5. 不引入 Forvo / Cambridge / ElevenLabs，不新增 Tauri speech plugin。若日后证明本项目 WebView 的 Web Speech 不可用，再另开决策。
6. 视觉：指针、小型本地 SVG 喇叭；不是大块主按钮。适用范围、句子来源、sticky 原句布局不变。

Reason: 系统 TTS 满足“听这个词”而不引入远程音频供应链或仓库体积。
Alternatives rejected: 预录 MP3；词典 CDN；把 IPA 符号送进 TTS；Reveal 自动播放；en-GB；为 TTS 改 FSRS/Home/Search/时区。
Consequences: UI-016 记录该交互。朗读内容是 lemma，不是句子里的 displayForm，也不是 IPA。
Tests/docs affected: `src/speech/systemTts.ts`, `ContextCard`, unit/UI tests, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`.

### DEC-038 · 应用图标改为倾斜语境卡片标记；继续使用 Apple inset

Date: 2026-09-01
Status: Accepted
Related requirements: PWA-001, DESKTOP-002; DEC-034
Context: 所有者选定新的应用标记：靛蓝色 rounded squircle 上放一张略向逆时针倾斜的白底语境卡片，上下两条浅紫线、中间一条金色高亮条。附件可能是 1536×1024 宽画布，需先裁到 squircle 的正方形。先前 DEC-034 仍使用蓝底白书；若把新图满幅铺进 1024，Launchpad 会再次显得过大。
Decision:

1. 应用图标标记改为该 context-card 图形。不保留白书，不改成另一种构图，也不把金色高亮改回旧的浅蓝条。
2. macOS / Tauri / PWA any-purpose 继续使用 DEC-034 inset：1024 透明画布上可见 squircle 为 824×824，每边 100px 透明边（约 80.5%）。squircle 外的四角保持透明。禁止把标记铺满 1024。
3. 矢量主稿是 `public/icons/icon-source.svg`：该标记是圆角方、倾斜卡片和三条圆头线，适合 SVG 几何还原。栅格主稿 `src-tauri/icons/icon-1024.png` 由该 SVG 导出，再运行 `desktop:icons`（`tauri icon`）生成 `icon.icns` / PNG / `icon.iconset`。PWA 192/512 共用同一 padded source。
4. maskable PWA 图标仍用满幅靛蓝色安全区稿（`icon-maskable-source.svg`），不套 100px inset。

Reason: 新标记直接表达 Context Card；macOS 槽位仍会原样显示整张 1024 图，透明边必须做在素材里。
Alternatives rejected: 继续用白书；把附件满幅丢进 1024；只改 icns 不改 source；maskable 也加 inset。
Consequences: Windows/Linux 与 PWA any-purpose 跟随同一 padded master。下一版 Apple Silicon `.app` 才能在 Launchpad 上确认观感。
Tests/docs affected: `public/icons/**`, `src-tauri/icons/**`, `docs/TRACEABILITY.md`.

### DEC-039 · Home 以个人词库搜索为主，Next Session 为次

Date: 2026-09-03
Status: Accepted — search-desk chrome and result-row layout superseded by DEC-042; search-primary / Next Session-secondary hierarchy remains.
Related requirements: UI-001, UI-006, UI-015; DEC-032, DEC-034
Context: DEC-032 把 Next Session 做成首页英雄，搜索只是顶部紧凑胶囊。打开应用因此像还债（你欠一批复习），而不是写作时查已学语境。所有者要求反转层级：个人词库搜索是打开应用的主因，Next Session 是可选的清队列入口。不引入 streak 压力文案、XP、排行榜、每日目标或打卡日历。
Decision:

1. Home 的主表面是本地 Context Card 检索。搜索区视觉上更大、更可点，空间上先于 Next Session。标题用中文「词库」。空查询仍无 placeholder（DEC-034），不恢复「用中文搜学过的词」。无匹配仍只显示「还没有学过相关的词」。检索范围、排序、禁止词典/Add Word/独立 Search 导航仍按 DEC-032。结果在文档流中展开，Next Session 出现在结果下方，不用 overlay 挡住它。
2. Next Session 保留「Start next session」和下一张到期语境句，但降为搜索下方的次级操作：更安静、更小，不是屏幕存在的理由。选择规则仍按 DEC-032：剩余 New+Review 最多的模块，并列取 Research English；有 Review 先 Review。不得拆回两个同等 Continue。
3. 问候、模块摘要、streak、sync 仍在首页，但不与搜索争英雄位。问候语保持本地时区计算。不改学习流、FSRS、Reveal、IPA TTS、时区或应用图标。
   Reason: 写作工具打开是为了查已经学过的词；到期句子是顺手清掉的一件事。
   Alternatives rejected: 保持 Next Session 英雄；两个并列 Continue；独立 Search 导航；恢复 placeholder；结果 overlay 挡住 Next Session；把搜索做成新的主导航页。
   Consequences: UI-001 线框改为搜索主导；UI-015 不再写成“紧凑胶囊”。DEC-032 的队列选择、peek 与检索规则仍有效，只是视觉主次被本决策取代。
   Tests/docs affected: `HomePage`, `LexiconSearch`, `NextSessionCard`, `src/styles/global.css`, Home UI tests, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/TRACEABILITY.md`.

### DEC-040 · Canonical seed 扩到 120 张，原 60 张身份不变

Date: 2026-09-03
Status: Accepted
Related requirements: CONTENT-001/002/011, RES-001/002, MED-001/002, ASSIGN-003/004, PERF-006, TEST-034
Context: 第一批 60 张 Context Cards 已写入 `wordeasy-seed-v1` 并随 `20260826000500_seed_content.sql` 应用到生产。继续扩词库时不得伪造 DOI/PMID/期刊，也不得改 Home UI、FSRS、TTS、时区或图标。校验器若仍要求 15+6+9 / 30 / 60 会把合法的第二批判失败。
Decision:

1. 在同一 `dataset_key` 下追加第二批 60 张原创例句，总量 120：Research 再 15+6+9，Medical 再 30，分类覆盖加倍。
2. 原 60 张 `card_key` / UUID 保持稳定；新卡继续用同一 `uuid_namespace` 与 key 方案。
3. 已应用的 `20260826000500_seed_content.sql` 不得重写。第二批由后续 additive migration 插入。
4. 每日配额不变：Research 5+2+3，Medical 10。更多卡片只增加可分配新卡天数。
5. Demo 仍从各类别取第一张，保持 20-card 子集。standalone/desktop catalog 版本改为 `canonical-120-v1`，每模块 60 张。

Reason: 生产已吃下第一批 seed；重写旧 migration 会让已应用环境和仓库分叉。身份稳定才能保住已学进度。
Alternatives rejected: 改 `dataset_key`；重生成全部 120 张进旧 migration；把每日配额改成吃掉更多新卡；为凑数编造文献来源。
Consequences: 未冻结的新用户 Day-1 抽卡集合可能因候选池变大而改变；已冻结的当日 assignment 不变。云端需 apply 新 migration 后才有第二批。
Tests/docs affected: `data/seed-data.json`, validator/counts, seed SQL pipeline, personal catalog version, content/assignment tests, `docs/04_CONTENT_SCHEMA.md`, `docs/TRACEABILITY.md`.

### DEC-041 · 中文 UI 使用本机 PingFang-first 字体栈

Date: 2026-09-06
Status: Accepted
Related requirements: PERF-001, UI-004, UI-014, TEST-033; DEC-010
Context: 所有者认为中文难看。`--font-ui` 把 `Segoe UI` / Arial 放在 PingFang 之前时，混合中文会落到西文 UI 字体的劣质 CJK 回退。DEC-010 与所有者选择禁止远程/Web 字体。DEC-039（Home 视觉层级）与 DEC-040（第二批 seed）已由并行 PR 占用。
Decision:

1. `--font-ui` 保留 Apple 西文路径（`ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`），随后立刻列出 `"PingFang SC"`, `"Hiragino Sans GB"`, `"Heiti SC"`, `"Noto Sans SC"`, `"Microsoft YaHei UI"`, `"Microsoft YaHei"`，再才是 `"Segoe UI Variable"`, `"Segoe UI"`, `"Helvetica Neue"`, `Arial`, `sans-serif`。
2. `:lang(zh)` / `:lang(zh-CN)` / `[lang="zh-CN"]` 使用 `--font-zh`：CJK 系统字体在前，西文系统字体在后。中文 UI（释义、适用范围、词库检索空态等）走 PingFang / Hiragino / YaHei；英文 lemma、IPA、语境原句仍用 `--font-ui`。
3. 带 `lang="zh-CN"` 的标题把 `font-weight: 650` 收到 `600`，以对齐 PingFang Semibold，避免不存在的 650 档在 `font-synthesis: none` 下发虚或发糊。不改版式、字号或信息架构。
4. 不下载、不打包字体文件，不 `@import` Google / Adobe / 其他 CDN `@font-face`。DEC-010 继续有效。

Reason: 零包体即可让 CJK 不再落到 Segoe / Arial；`:lang(zh)` 在 Windows 上还能避开 `system-ui`→Segoe 的字体链接。
Alternatives rejected: Google Fonts / CDN `@font-face`；把完整 Noto 打进 bundle；全局改用衬线或另一套设计系统字体。
Consequences: Linux CI 没有 PingFang，不能代替所有者在 macOS 上的观感验收。未标 `lang` 的中文仍走 `--font-ui` 的 per-glyph 回退。
Tests/docs affected: `src/styles/tokens.css`, `src/styles/global.css`, font-stack unit test, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/TRACEABILITY.md`.

### DEC-042 · Home 搜索去掉「词库」标题，结果行收成 lemma+中文

Date: 2026-09-06
Status: Accepted
Related requirements: UI-001, UI-015; DEC-034, DEC-039
Context: DEC-039 把个人词库搜索做成首页主表面，并加上中文「词库」标题。所有者反馈标题多余，结果卡层数太多（lemma、英文释义、中文、语境句各自占一行），多条近义结果还会把 Home 无限拉长。不改检索范围、排序、空 placeholder，也不把 Next Session 拉回英雄位。
Decision:

1. 空查询只保留搜索 pill/box 作为主表面。去掉「词库」标题。可访问名称仍由 `<search>` / 输入的 `aria-label` 与 label 提供（“Search learned Context Cards”）。`placeholder=""` 不变（DEC-034）。
2. 每条结果：模块 eyebrow 可保留且保持安静；lemma 与中文释义同一行，中文在 lemma 右侧；下一行保留 `meaning_en`；语境句保留但更小、更淡。不得另加「解释」或同类镀铬。
3. 多条结果放在有限高度的纵向可滚动面板内，Next Session 仍在搜索区下方的文档流中，不用 overlay。检索/排序/禁止词典与 Add Word 仍按 DEC-032。
   Reason: 打开应用是为了立刻查已学语境；标题和分层窗口会挡住 lemma+中文这一眼信息。
   Alternatives rejected: 恢复「词库」标题或 placeholder；删掉语境句；把结果做成挡住 Next Session 的 overlay；为结果发明「解释」分区。
   Consequences: DEC-039 的搜索-主 / Next Session-次层级仍有效，只是搜索桌面的标题与结果行布局由本决策取代。UI-001 线框与 UI-015 空查询描述同步去掉「词库」标题。
   Tests/docs affected: `LexiconSearch`, `src/styles/global.css`, Home UI tests, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/TRACEABILITY.md`.

### DEC-043 · Medical 内开词根构词配额，停用过难专科卡

Date: 2026-09-07
Status: Accepted — “不新增第三个顶层模块” superseded by DEC-047; morphology remains inside Medical
Related requirements: MED-001/002/003, ASSIGN-004, CONTENT-002/007/011, TEST-004/034; DEC-013/018/040
Context: 所有者不是应试学习者，用 -itis、-osis、derm、hemat、leuko 等语素读医学词。当前不少 Medical seed（preload、bioavailability、transaminitis、dysplasia、anastomosis、hemolyze 及同类专科写作词）对他们无用。他们要求「医学里面再开一个模块」学构词，并点名 endocarditis（正确拼写，不是 endocardiacitis）。
Decision:

1. 不新增第三个顶层模块。Medical English 内增加 `morphology` 分类，中文 UI 为「词根构词」。学习单元仍是 Context Card，学习点是 prefix+root+suffix 拆解。
2. 每日 Medical 新卡先按 7 病历/课堂用语 + 3 词根构词落地；该配额已被 DEC-044 翻转为 7 词根构词 + 3 病历用语。本地选择器和 `ensure_daily_assignment_v1_unlocked` 必须与当前配额同步；任一池不足则整组 shortage，不得跨池补足。
3. 已发布过难专科卡停用（`active = false`），UUID / card_key / lemma 身份不变。用更易读的病历用语替换同一临床分类名额。词根卡使用新 UUID。
4. 原 60 + 第二批 60 的 SQL migration 不重写。停用、替换和词根卡由 additive migration 完成。当时 catalog 版本为 `canonical-medical-morphology-v1`；DEC-044 再升为 v2。Demo 仍 20 张，Medical 配额以 DEC-044 为准。
5. 停用卡保留在词库身份里，供已有 FSRS / Review 继续显示；新卡分配只取 `active` 卡。云端 ingest 允许给已停用卡记分，避免进度被卡住。

Reason: 这是最小且符合 CORE Medical 分类+配额模型的形状，既给构词一条独立学习面，又不发明空导航或第三套进度。
Alternatives rejected: 第三个顶层模块；回收旧 UUID 改写成新词；重写已应用 seed migration；把构词只当翻译附录而不改每日配额。
Consequences: Medical 生效词库大于 60；未冻结的新用户 Day-1 集合会变；已冻结当日 assignment 不变。Home / Today 用安静中文写出配额，不做游戏化。配额文案以 DEC-044 为准。
Tests/docs affected: seed JSON/SQL, validator/counts, assignment selector/RPC/parser, catalog version, Demo/standalone, Home/Today copy, `docs/01_PRODUCT_CORE.md`, `docs/04_CONTENT_SCHEMA.md`, `docs/TRACEABILITY.md`.

### DEC-044 · Medical 配额改为 7 词根构词 + 3 病历用语，并以所有者教材词表扩卡

Date: 2026-09-07
Status: Accepted — “不新开第三个顶层模块” superseded by DEC-047; Medical 7+3 quota unchanged
Related requirements: MED-001/002/003, ASSIGN-004, CONTENT-002/007/011, TEST-004/034; DEC-013/018/040/043
Context: 所有者反馈 PR #15：他们主要靠词根构词学医学英语，病历用语只需少量陪练。指定 PDF《医学专业英语的重点单词终结版》为 Medical 主词源，并要求每日配额翻转为 7 词根 + 3 病历。
Decision:

1. 每日 Medical 新卡改为严格 7 词根构词 + 3 病历/课堂用语，合计仍是 10。本地选择器、`ensure_daily_assignment_v1_unlocked`、cloud parser、Demo 20 卡同步该配额。任一池不足则整组 shortage，不得跨池补足。
2. 不新开第三个顶层模块。`morphology` / 「词根构词」仍是 Medical 内分类。Home / Today 文案改为「7 词根构词 + 3 病历用语」。
3. 词根生效卡扩到至少 56–70 张，优先收录 PDF 中可拆 prefix/root/suffix 的课堂词（如 stomatitis、colitis、hematology、asymptomatic、pathogen、apnea）。保留已发布且仍好用的 endocarditis 等卡。不复活已停用专科卡。
4. 病历池当时补入 PDF 里的 symptom、sign、diagnose、artery、vein、acute、chronic 等易读词；该浅池已被 DEC-045 停用并换成教材中档病历用语。跳过带侮辱性历史病名（如 mental retardation、venereal disease）。
5. 已应用 seed migration 不重写。PDF 扩卡与配额翻转用 additive migration。当时 catalog 版本为 `canonical-medical-morphology-v2`；DEC-045 再升为 v3。词根卡继续用新 UUID；usage_note 写清语素，并写明凭词根猜测可能错过临床细节。无伪造 DOI/PMID。

Reason: 所有者明确说构词才是主学习面，病历用语只作陪练；教材词表比专科写作词更贴近课堂。
Alternatives rejected: 维持 7 病历 + 3 词根；为配额再开第三个顶层模块；把 PDF 里难拆或过时病名全部做成卡。
Consequences: 未冻结的新用户 Day-1 Medical 集合再次变化；已冻结当日 assignment 不变。词根池需支撑连续多日 7/day。病历池难度以 DEC-045 为准。
Tests/docs affected: seed JSON/SQL, validator/counts, assignment selector/RPC/parser, catalog version, Demo/standalone, Home/Today copy, `docs/01_PRODUCT_CORE.md`, `docs/04_CONTENT_SCHEMA.md`, `docs/TRACEABILITY.md`.

### DEC-045 · 病历池升到教材中档词，停用过浅 chart 填充

Date: 2026-09-07
Status: Accepted
Related requirements: MED-001/002/003, ASSIGN-004, CONTENT-002/007/011, TEST-004/034; DEC-043/044
Context: 所有者反馈 PR #15：每日仍要 7 词根构词 + 3 病历用语，但 3/day 的病历池太浅（symptom、sign、diagnose、artery、vein、acute、chronic 及发热级基础词）。要求只用所有者教材 PDF 里的中档课堂词补病历池；词根展示词仍留在 morphology。
Decision:

1. 配额不变：严格 7 词根构词 + 3 病历用语。Home / Today 文案仍是「7 词根构词 + 3 病历用语」。
2. 停用过浅病历卡（含本 PR 已插入的 symptom/sign/diagnose/artery/vein/acute/chronic，以及 fever、abdomen、pulse、airway、infection、dose 等同类基础填充）。UUID / card_key / lemma 不变。不复活 DEC-043 已停用的专科难词。
3. 用 PDF 中档词扩充病历池到可支撑多日 3/day（约 30+ 张生效病历卡）：如 esophagus、trachea、capillary、gallbladder、pancreas、hormone、insulin、hereditary、abscess、absorption、elimination。已是生效词根卡的 lemma（pathogen、antigen、paralysis、peristalsis 等）不在病历池重复。
4. 继续跳过侮辱性或过时病名。additive migration 完成停用与插入。catalog 版本改为 `canonical-medical-morphology-v3`。

Reason: 3/day 陪练仍要有课堂用处，但不能是「什么是动脉」那种入门填充，也不能再滑回专科写作难词。
Alternatives rejected: 改变 7+3 配额；把已有词根卡改分类进病历池；重写已落地 seed migration。
Consequences: 未冻结 Day-1 病历三张会换成中档教材词；词根 7/day 不变。
Tests/docs affected: seed JSON/SQL, validator/counts, catalog version, Demo/standalone, `docs/04_CONTENT_SCHEMA.md`, `docs/TRACEABILITY.md`.

### DEC-046 · 学习卡正面改为可见 lemma + 完整原句，不再挖空

Date: 2026-09-07
Status: Accepted
Related requirements: CORE-003, UI-008, TEST-002; DEC-002, DEC-035, DEC-036
Context: 所有者在手机上使用当前 cloze 正面（句子里目标词被下划线挖空，提问 “What does the missing word mean in this context?”）觉得过难。他们已经认识或能看见这个词，只需要猜测它在当前科研/医学语境中的意思。这与 DEC-036 锁定的正面 cloze 冲突。
Decision:

1. 未揭示正面必须同时显示：lemma 醒目标题、完整语境原句（target 可见，允许 `<mark>` 高亮，禁止空白/下划线挖空）、既有词性 / IPA / 分类。
2. 提问改为 meaning-in-context，例如 “What does this word mean in this context?”。不得再写 missing word 或要求填空。
3. 正面仍不得泄露释义：中文释义、英文 meaning、paraphrase、完整句子翻译。Reveal 后的释义堆叠、sticky 原句、IPA tap-to-speak、FSRS / sync / assignment / seed 内容不变。
4. 本决策取代 DEC-035 / DEC-036 / DEC-037 中把正面规定为 cloze 的条款。

Reason: Context-first 的学习对象是 sense-in-context，不是默写词形。挖空把任务变成 cloze，超过所有者当前需要的难度。
Alternatives rejected: 保留挖空只改提问文案；正面只显示 lemma 不显示原句；Reveal 前高亮但隐藏 lemma。
Consequences: CORE-003 / UI-008 / TEST-002 从 “target 隐藏” 改为 “lemma + 可见原句”；答案仍是释义而不是词形。
Tests/docs affected: `ContextCard`, Study UI/E2E tests, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`.

### DEC-047 · 第三个模块「必备医学英语」；Reveal 以释义为焦点并去掉句子来源

Date: 2026-09-08
Status: Accepted
Related requirements: CORE-004/005/011, UI-009, ASSIGN-008, CONTENT-008/013, TEST-002/006/034/044; DEC-035/043/044/046
Context: 所有者要把教材《医学专业英语的重点单词终结版》做成可独立选择的第三套学习，而不是并进现有 Medical（词根构词）轨道。同时反馈 Reveal 背面层级过平、难找到释义，「句子来源」对学习无帮助。
Decision:

1. 新增顶层模块 `essential_medical`，中文显示名「必备医学英语」。Home 三个 Continue 入口与既有 Research / Medical 相同；Settings 仍无模块开关（现有 UX 也没有）。本决策取代 DEC-043/044 中「不新增第三个顶层模块」的条款；词根构词仍留在 Medical 内，Research 5+2+3 与 Medical 7+3 不变。
2. 每日新卡 10 张，全部来自 `core`。本地选择器、`ensure_daily_assignment_v1_unlocked`、cloud parser 同步该配额。不足则整组 shortage。
3. 词库覆盖 `data/essential-medical/lemmas.txt` 全部 lemma（当前 663 条，不得缩短）。释义优先解析 `source.txt`（若仍是占位则按 `source.part1.txt`…`source.part5.txt` 顺序拼接非占位片段）；缺项用课堂/教材义补全。独立 JSON/SQL，不改写 `data/seed-data.json` 或已应用 Research/Medical seed migration。`collocations` 为空；`usage_note` 可空；例句仅为 `original_example`，不编造 DOI/PMID。生成脚本不得覆写 `lemmas.txt`。
4. 全部模块 Reveal 去掉「句子来源」/ SourceDetails。必备医学英语另外隐藏 Common collocations。其余模块 collocations 非空时仍显示，但视觉降权。适用范围仅非空时显示。
5. Reveal 主视觉改为中文释义（大号），英文 meaning 紧随其后仍突出；paraphrase 与句子翻译降为次要灰字，不再用并列 h2。sticky 语境原句与 IPA tap-to-speak 不变。
6. catalog 版本 `canonical-essential-medical-v2`。云端 Postgres 必须另行 apply `20260908001300` 与 `20260908001400`；仓库落地不等于远程已迁移。

Reason: 所有者要学完整课堂词表，且与构词课分开；Reveal 的学习点是 sense，不是来源或一排同等权重的区块。
Alternatives rejected: 把 660+ 词并进 Medical 配额；手写 600 行 SQL；为 collocations 编造课堂搭配；保留句子来源只改文案；缩短词表。
Consequences: 未冻结 Day-1 出现第三套 10 新卡；standalone/personal catalog 变为 900 张（60+177+663）；Demo 仍 20 张 Research+Medical，必备医学英语在 Demo 中 shortage（newTotal 0）。DEC-035 第 3 条（背面第 8 层「句子来源」）由本决策取代。
Tests/docs affected: domain/routes/Home/Today/ContextCard, assignment RPC/parser, essential seed script/SQL, content validator, UI/E2E/content tests, `docs/01_PRODUCT_CORE.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/04_CONTENT_SCHEMA.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`.

### DEC-048 · 空 shortage set 可在词库补足后自愈；模块日缓存隔离刷新

Date: 2026-09-08
Status: Accepted
Related requirements: ASSIGN-002/006/008, SYNC-006, RES-003, TEST-013; DEC-006/013
Context: 必备医学英语上线前，某日可能已写入 `status='shortage'` 的空 assignment set。词库 seed 之后 `ensure_daily_assignment` 仍直接返回该 set，当天永远无法分配。同时 `AccountCloudDayCache` 用 `Promise.all` 刷新全部模块，任一模块抛错会把整个 Sync 标为 failed。
Decision:

1. `ensure_daily_assignment_v1_unlocked` 对已存在的 **ready** set 仍立即返回；DEC-006 对已分配卡片的冻结不变。
2. 已存在且 `status='shortage'` 且 `assigned_count=0` 的 set：若当前目录仍不足配额，原样返回、不改写；若现已足够，删除该空 shortage set 后按原确定性规则生成 ready set。适用于全部模块，不仅 `essential_medical`。
3. 客户端按模块隔离刷新 day cache。单个模块失败只记录警告；仅当偏好 / coordinator 等关键步骤失败，或全部模块刷新都失败时，整体 Sync 才为 failed。

Reason: shortage 不是已完成的当日卡片集合；冻结它会在 catalog 迟到时永久锁死该学习日。一个模块的刷新失败不应株连 Research / Medical 等其他轨道。
Alternatives rejected: 手工删除 shortage 行；只对 `essential_medical` 自愈；部分模块失败也标 Sync failed；用 Service Worker 代替本地重试。
Consequences: 同一用户同一日在 catalog 从不足变为足够之后，shortage 可变成 ready；ready 一旦写入仍不可变。远程 Postgres 必须另行 apply `20260908001500`。DEC-013「冻结结构化 shortage」收窄为：词库仍不足时冻结；词库补足后允许用 ready set 替换空 shortage。
Tests/docs affected: `accountSyncGateway`, assignment RPC migration, SQL/gateway tests, `docs/02_DATA_SYNC_SECURITY.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`.

### DEC-049 · 部分模块日缓存仍构成可用 Home

Date: 2026-09-08
Status: Accepted
Related requirements: LOCAL-004, UI-006/007, SYNC-006, TEST-009; DEC-048
Context: DEC-048 允许单个模块 day-cache 失败时整体 Sync 仍为 synced。`getCachedHome` 却要求当日三个模块的 `daily_summary` 都存在，任一缺失即返回 null。`LearningAppProvider` 在 `status === "synced"` 后只在 snapshot 非 null 时升级 Home，因此部分成功的 Sync 会留下「Synced / Sync now」+ 整页 empty。
Decision:

1. `getCachedHome` 在至少一个模块有当日 `daily_summary` 时返回 `HomeSnapshot`。缺失模块用 0/0、0 words learned 占位，不写入、不编造 assignment。三个模块都没有当日 summary 时仍返回 null；TEST-009 离线未缓存空态不变。
2. 首次 hydrate 不得用后来的 null 读取覆盖已经 ready 的 Home。`refreshHomeAfterSync` 仍只在 snapshot 非 null 时升级；在 (1) 之后，部分缓存会使 synced 刷新进入模块卡。

Reason: 模块日缓存按 DEC-048 隔离；一个模块刷新失败不应让用户看不到已缓存的 Research / Medical / 必备医学英语。
Alternatives rejected: 失败模块也写入假 summary；把 `HomeSnapshot.modules` 改成 partial record；部分失败仍整页 empty。
Consequences: 未缓存模块在 Home 上显示 0/0，Today 仍按既有缺失 summary 行为处理。必备医学英语继续作为第三模块，不被 Research/Medical 替换。
Tests/docs affected: `indexedDbLearningRepository`, `LearningAppProvider`, Home/repository tests, `docs/02_DATA_SYNC_SECURITY.md`, `docs/03_FRONTEND_PWA_PERFORMANCE.md`, `docs/TRACEABILITY.md`.

### DEC-050 · 模块日缓存串行刷新；本地集合冲突时清缓存并重试一次

Date: 2026-09-09
Status: Accepted
Related requirements: SYNC-006, LOCAL-004, ASSIGN-002/008, TEST-011; DEC-048/049
Context: DEC-048 用 `Promise.allSettled` 按模块隔离刷新。生产上 Research/Medical 的 `daily_summary` 已写入，必备医学英语仍停在 0/0，整体 Sync 仍为 synced。云端 `essential_medical` 当日 ready set 正常。并行对同一 Dexie 表开 `rw` 事务可能导致其中一个模块（常是列表最后的必备医学英语）写入失败且被隔离吞掉。另一条路径是本地旧 New/Review 集合与云端当日集合冲突，`#cacheSnapshot` 抛错后只 `console.warn`，Home 继续读未缓存或 shortage 的 0/0。
Decision:

1. `AccountSyncGateway` 按 `MODULE_SLUGS` 顺序串行刷新模块日缓存，避免并发 IndexedDB 写入互相打断。必备医学英语仍是第三模块。
2. 单个模块失败仍只记警告；仅全部模块失败或关键步骤失败时整体 Sync 为 failed（DEC-048 隔离不变）。
3. 本地 New/Review 日缓存与云端当日集合冲突时，清除该用户该模块该日的 assignment / review assignment / assignment set，然后对同一 snapshot 再写入一次。不重拉网络。重试仍失败则按原隔离规则警告。
4. 成功写入必须用云端 ready set 的真实 `newTotal`/`reviewTotal` 覆盖旧 shortage 或未缓存占位；空 collocations 仍允许。

Reason: Home 在 DEC-049 下会把缺失/失败模块画成 0/0。Sync 成功时，服务器已 ready 的模块必须能落到本地摘要，而不是永久占位。
Alternatives rejected: 继续并行刷新只加 Dexie 超时；冲突时永久遵守本地旧集合；冲突失败标整个 Sync failed；用 Service Worker 代替 IndexedDB。
Consequences: Sync 的三个模块日缓存 RPC 变为串行，延迟略增。同一日本地与云端 New 集合不一致时以云端为准并丢弃该日本地旧 assignment 行；`totalLearned` / streak 仍由未删除的 `daily_summary` 保留后被覆盖写入。
Tests/docs affected: `accountSyncGateway`, `cloudDayCache`, gateway/day-cache tests, `docs/02_DATA_SYNC_SECURITY.md`, `docs/TRACEABILITY.md`.

### DEC-051 · 云端卡片解析接受空的可选文案（usage_note）

Date: 2026-09-09
Status: Accepted
Related requirements: SYNC-006, CONTENT-003/007/013, CORE-011, ASSIGN-008, TEST-011; DEC-047/048/049/050
Context: 生产上 clear site data + OTP + Sync 后 Research/Medical 显示 0/10，必备医学英语停在 0/0。服务器当日 `essential_medical` ready set 有 10 张卡。`parseDailyLearningSnapshot` → `contextCard` 用 `string()` 拒绝空字符串；live `get_daily_learning_snapshot` 里 essential seed 的 `usage_note` 为 `""`。`AccountCloudDayCache.refresh('essential_medical')` 每次 Sync 抛 `CloudPayloadError`；DEC-048 隔离让整体 Sync 仍为 synced；DEC-049 把未缓存模块画成 0/0。扫描 `data/essential-medical/cards.json`：663 张卡里唯一空字符串字段是 `usage_note`；`collocations` 是空数组，已由 DEC-047/050 允许。
Decision:

1. 云端 Context Card 解析对 `usage_note` 接受任意 string，包括 `""`。不得把空 usage note 改写成占位中文。
2. lemma、释义、例句等身份与语境字段仍要求非空。citation 字段仍为 null 或非空 string。
3. 内容校验器对必备医学英语空 `usage_note` 的既有例外保持不变；Research/Medical 仍要求中文使用强度说明。

Reason: DEC-047 已规定必备医学英语 `usage_note` 可空；线格式解析必须与 seed 和 RPC 载荷一致，否则该模块永远无法写入当日 summary。
Alternatives rejected: 给 663 张卡编造 usage_note；把空字符串改成 null 再改 RPC；只在 essential 模块分支放行；Sync 失败时标整个 Sync failed。
Consequences: 空 usage_note 的 ready snapshot 可以写入 `newTotal: 10`。UI 已对空「适用范围」隐藏（DEC-047）。
Tests/docs affected: `src/data/cloud/parsers.ts`, cloud parser + day-cache tests, `docs/02_DATA_SYNC_SECURITY.md`, `docs/TRACEABILITY.md`.

### DEC-052 · 必备医学英语课堂构词 + 多样例句；Sync 失败露出原因

Date: 2026-09-10
Status: Accepted (sentence templates superseded by DEC-053; root/affix usage_note still in force)
Related requirements: CONTENT-005/007/013, CORE-011, UI-007, TEST-036; DEC-047/051
Context: 所有者要求：能拆词根词缀的必备医学英语 lemma 把课堂构词写进卡片；同时停用“The chapter on X opens with the Y as a teaching example”一类重复句。`SyncStatus` 失败时只显示 Sync failed，把 `state.message` 藏掉。
Decision:

1. 必备医学英语 `usage_note` 仍可空（DEC-047/051 解析契约不变）。能讲清前缀/词根/后缀时写入一两句中文课堂构词，例如 bronchiectasis → bronchio-（支气管）+ -ectasis（扩张）。不改 `meaning_en` / `meaning_zh`，不编专科行话。
2. 重新生成 `context_sentence`、paraphrase、中文翻译，使用病历、查房、讲课、短病例、教材插图、老师指图等多样模板；`target_text` 仍等于 lemma，原句必须含 lemma。禁止再生成 “opens with … as a teaching example”。
3. JSON 由生成脚本重写；云端用 additive UPDATE（`word_senses.usage_note` 与 `contexts` 三句字段），不重写 `20260908001400`，不改 card / word / sense UUID。standalone catalog 升为 `canonical-essential-medical-v3` 以重载本地文案。
4. `SyncStatus` 在 `status === "failed"` 且 `message` 非空时附加缩短后的失败原因；英文消息保持英文短句。

Reason: 课堂构词帮助记实用词，不是另开一门词根课；例句重复会把 Context-first 学成填模板。失败原因可见才能判断是网络、解析还是单模块问题。
Alternatives rejected: 给全部 663 张卡编造 usage_note；destructive 全量 reseed；把词根写进 meaning 字段；Sync 失败整页 alert。
Consequences: 已应用 `20260908001400` 的远端必须再 apply `20260910001600` 才会更新云端文案。空 usage_note 仍合法。本地个人词库版本号前进，下次启动重写 cached cards。
Tests/docs affected: essential seed script/JSON/SQL, content validator tests, SyncStatus UI/CSS, `docs/01_PRODUCT_CORE.md`, `docs/04_CONTENT_SCHEMA.md`, `docs/05_ACCEPTANCE_TESTS.md`, `docs/TRACEABILITY.md`.

### DEC-053 · 必备医学英语例句改为真实生理 / 临床语境

Date: 2026-09-10
Status: Accepted
Related requirements: CONTENT-005/013, CORE-011, TEST-036; DEC-047/052
Context: 所有者反馈必备医学英语全部例句仍像课堂点名（查房让低年资说出术语、讲课幻灯、教材插图、老师指图）。期望如 phagocytosis：细胞吞入细菌或有害物质，而不是教学框架。DEC-052 的课堂构词 `usage_note` 仍然有效。
Decision:

1. 重新生成全部约 663 张 `essential_medical` 卡的 `context_sentence`、`plain_english_paraphrase`、`sentence_translation_zh`。优先细胞与宿主防御、体内解剖/生理、典型临床表现、病程与化验影像写法。禁止 ward round / registrar / juniors / lecture / textbook chapter / tutor / classroom / glossary / labelled slide / teaching example 等课堂框架。
2. lemma、`meaning_en`、`meaning_zh`、IPA、词根 `usage_note`、card / word / sense / context UUID 保持不变。collocations 仍为空。
3. JSON 由生成脚本重写；云端用 additive UPDATE 只改 `contexts` 三句字段，不重写 `20260908001400` 或 `20260910001600`，不改 card ID。standalone/personal catalog 升为 `canonical-essential-medical-v4` 以重载本地文案。

Reason: Context-first 学的是词在真实医学语境中的意思，不是认出黑板上的术语标签。
Alternatives rejected: 只改 phagocytosis 一张；把英文释义直接抄进原句当词典定义；destructive 全量 reseed。
Consequences: 已应用前两份 essential 迁移的远端必须再 apply `20260910001700` 才会更新云端例句。词根 usage_note 不被本迁移改写。
Tests/docs affected: sentence builder, `data/essential-medical/cards.json`, additive SQL, catalog version, content tests, `docs/01_PRODUCT_CORE.md`, `docs/04_CONTENT_SCHEMA.md`, `docs/TRACEABILITY.md`.

### DEC-054 · 必备医学英语例句禁止不通顺的填槽模板

Date: 2026-09-10
Status: Accepted
Related requirements: CONTENT-005/013, CORE-011, TEST-036; DEC-047/052/053
Context: PR #23（DEC-053）已合并，但 generic “把 lemma 填进 130 个壳子” 仍产出不通顺的 mad-lib，例如 cube-shaped → “The episode was cube-shaped enough…”，collarbone → “The host response … included collarbone”，hyperthyroidism → “Pain mapped over the hyperthyroidism”。所有者要求每条 essential_medical 例句必须是该词实际医学义的生理/临床/病历句子，禁止课堂框架，也禁止不通顺模板。
Decision:

1. 例句生成改为 per-lemma override + 按英文释义驱动的 builder，不再把 lemma 填进与词义无关的通用壳。
2. 重新生成全部约 663 张卡的 `context_sentence` / paraphrase / 中文翻译。lemma、`meaning_en`、`meaning_zh`、IPA、词根 `usage_note`、UUID 不变。
3. 云端用 additive UPDATE 只改 `contexts` 三句字段；不重写 `20260908001400`、`20260910001600`、`20260910001700`。catalog 升为 `canonical-essential-medical-v5`。
4. 质量检查失败条件包括：`progress line mentioned`、形容词 `episode was ADJ enough`、学科名词 `operative report used X to map`，以及把非结构词塞进 “scan showed swelling around” 一类壳。

Reason: Context-first 要求例句里的词带着它的真实医学义，而不是能认出术语标签。
Alternatives rejected: 只改用户点名的几张卡；继续扩 130 个通用壳；destructive reseed。
Consequences: 已应用 `20260910001700` 的远端必须再 apply `20260910001800` 才会更新云端例句。
Tests/docs affected: `scripts/lib/essential-medical-sentences.mjs`, `scripts/lib/essential-medical-compose.mjs`, `data/essential-medical/cards.json`, `20260910001800_essential_medical_sentence_quality.sql`, catalog v5, content + migration tests, `docs/01_PRODUCT_CORE.md`, `docs/04_CONTENT_SCHEMA.md`, `docs/TRACEABILITY.md`.

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
