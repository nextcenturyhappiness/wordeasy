# 05 — Acceptance Tests

本文件定义 MVP 的自动测试、手工验收和发布门槛。

## 1. 基础命令

### TEST-001 · P0

根据项目脚本实际名称运行：

```text
install
format check
lint
typecheck
unit tests
component tests
integration tests
E2E tests
production build
content validation
bundle size check
```

不得声称未执行的命令已通过。

不得通过删除测试、`skip`、弱化断言、关闭 strict 或硬编码假数据制造绿色结果。

---

## 2. Product tests

### TEST-002 · Context-first

验证：

- 正面显示 context；
- target text 被高亮；
- 正面无中文答案；
- reveal 后背面信息完整，但不重复正面语境提问；IPA 出现在 sticky 原句区域，该行可点按朗读 lemma 而非 IPA 字符串；
- 正面 cloze 与 Reveal 本身不自动朗读；
- reveal 后语境原句（或高亮 target）仍在文档中，并以稳定顶部锚点保持在首屏，不得滚向评分按钮；
- Review state 绑定 card，不只绑定 lemma。

### TEST-043 · Revealed IPA system TTS

验证：

- Reveal 后 IPA 行是按钮；
- 点击调用可 mock 的 `speak(lemma)`，参数是英文词而不是 IPA；
- 未揭示正面没有该按钮，也不调用 speak。

### TEST-003 · Research 5 + 2 + 3

同一用户、同一日期的 Research assignment 必须是：

```text
5 general_research
2 statistics_methodology
3 bioinformatics
```

### TEST-004 · Medical 10

Medical 每日 10 个新卡。

### TEST-005 · New / Review

New 与 Review 分开，Again 重复步骤不重复增加完成卡片数。

### TEST-006 · 模块隔离

初始：

```text
Research 6 / 10
Medical 3 / 10
```

继续 Research 后，Medical 保持 3 / 10。

---

## 3. Persistence and offline

### TEST-007 · 刷新持久化

```text
1. 完成 4 张 Research 新卡。
2. 刷新。
3. 仍为 4 / 10。
4. events、state、summary 和 outbox 不丢失。
```

### TEST-008 · 离线学习

```text
1. 在线缓存今日卡片。
2. 断网。
3. 完成 3 张。
4. 刷新或关闭再打开。
5. 本地仍显示完成 3 张。
6. 三个事件位于 outbox。
7. 恢复网络。
8. 每个事件只上传一次。
```

### TEST-009 · 未缓存设备

设备从未同步今日卡片且处于离线时，显示明确提示，不生成另一套随机卡片。

### TEST-010 · IndexedDB migration

从旧版本升级：

- 保留用户数据；
- 不调用无条件清库；
- 迁移失败可见；
- 有自动测试。

---

## 4. Assignment

### TEST-011 · 同日稳定

```text
首次打开
→ 刷新
→ 重新登录
→ 关闭再打开
→ 第二客户端
```

均得到相同 assignment。

### TEST-012 · 并发

模拟两个客户端同时调用 assignment RPC，只产生一套云端 assignment。

### TEST-013 · 词库不足

分类不足时返回结构化错误，不重复旧词，不用其他分类偷偷补足。

### TEST-014 · 时区边界

至少测试：

- 本地午夜前后；
- UTC 日期不同但同一 IANA study_date 相同；
- 一个存在 DST 的 IANA timezone；
- Settings 没有 Study timezone / IANA timezone / Save timezone 编辑器。

---

## 5. Review and sync

### TEST-015 · 双击防重复

双击或快速键盘重复评分只创建一个本地 event。

### TEST-016 · 幂等重试

```text
上传 event
→ 响应超时
→ 重试
→ 云端只有一条 event_id
```

### TEST-017 · Outbox 部分失败

一批事件部分成功时：

- 已成功事件确认；
- 失败事件保留；
- 不重复成功事件；
- 不清空整个 outbox。

### TEST-018 · 同步锁

重复触发 startup、focus 和 online 时，只存在一个有效 sync loop。

### TEST-019 · 冲突

两个设备基于同一 revision 离线评分同一卡：

- 两个事件均保留；
- 冲突被识别；
- canonical state 通过确定性 reconciliation 生成；
- 不无声覆盖。

### TEST-020 · 跨设备

真实 Supabase 环境：

```text
设备 A 完成 6 张
→ 同步
→ 设备 B 同账户登录
→ 同步
→ B 显示 6 / 10
→ 两设备今日卡完全一致
```

无真实环境时标记为未验证，不能写成通过。

---

## 6. Security

### TEST-021 · RLS

验证用户 A 不能读取或修改用户 B 的：

- profile；
- assignments；
- Review events；
- states；
- settings。

### TEST-022 · Review event immutable

普通用户不能 update 或 delete 已存在 Review event。

### TEST-023 · Secret scan

源码、Git 跟踪文件和 production build 中不存在：

```text
service_role
SUPABASE_SERVICE_ROLE_KEY
真实 token
```

### TEST-024 · 账户本地隔离

```text
账户 A 缓存数据
→ 登出
→ 账户 B 登录
→ B 看不到 A 的卡片、进度和 outbox
```

---

## 7. PWA

### TEST-025 · Manifest

验证：

- name；
- short_name；
- start_url；
- scope；
- standalone；
- theme/background；
- 192 / 512 / maskable icons。

### TEST-026 · Service Worker

Production build：

- Service Worker 生成并注册；
- App Shell 可离线打开；
- 不缓存 Auth 和私有 API；
- 更新不清空 IndexedDB。

### TEST-027 · 安装

手工验证或明确标记未验证：

- Android Chrome 安装；
- macOS Chrome 安装；
- standalone 启动；
- 图标和启动背景正常。

---

## 8. Performance

### TEST-028 · 冷启动

Chrome、Android-sized viewport、4x CPU slowdown、Slow 4G，运行三次报告中位数：

```text
FCP
LCP
INP
CLS
```

### TEST-029 · Warm launch

Primed cache 下测量：

```text
App Shell
Cached Home
Home → first cached card
```

### TEST-030 · Supabase 慢或不可用

模拟：

- 5 秒远程延迟；
- 请求失败；
- 完全离线。

已有缓存时仍先显示 Home，首屏不等待远程请求。

### TEST-031 · 10,000 events

创建至少 10,000 条模拟 Review events：

- Home 启动不全表扫描；
- 主线程无明显长阻塞；
- summary 读取正确。

### TEST-032 · Bundle

检查：

```text
Initial JS gzip <= 150 KiB
Home cumulative JS gzip <= 200 KiB
Initial CSS gzip <= 30 KiB
Compressed precache <= 1.5 MiB
```

若不达标，必须记录测量、根因和修复，不得忽略。

### TEST-033 · 远程资源

首屏不请求远程字体，不加载完整词库，不加载 Deferred 功能代码。

---

## 9. Content

### TEST-034 · 数量

```text
Research = 60
General = 30
Statistics = 12
Bioinformatics = 18
Medical = 60
Total = 120
```

两批各保持 15 + 6 + 9 与 30 张 Medical 的覆盖；每日分配仍是 Research 5 + 2 + 3、Medical 10。

### TEST-035 · 来源

原创例句不带伪造 DOI、PMID、期刊或标题。

### TEST-036 · 内容字段

每张卡必填字段完整，target text 出现在 context 中，collocations 非空。

### TEST-037 · 人工抽查

Product Reviewer 抽查 seed cards 的：

- 语境自然度；
- 英文释义；
- paraphrase；
- 中文翻译；
- 医学和科研准确性；
- 分类；
- 重复。

---

## 10. Reviewer

### TEST-038 · 独立第一轮

Product Reviewer 与 Engineering Reviewer：

- 第一轮只读；
- 不读取对方报告；
- 分别输出 v1。

### TEST-039 · 修复账本

所有发现进入 `docs/REVIEW_RESOLUTION.md`，Disposition 只能是：

```text
Accepted
Partially accepted
Rejected with evidence
Deferred by explicit MVP scope
```

### TEST-040 · 第二轮

修复后两位原 Reviewer 重新检查实际代码和测试，分别输出 v2。

### TEST-041 · 托管本地数据 PWA 私有入口

Cloudflare Pages 上的 Preview 或正式 standalone PWA 发布前后必须保留以下证据：

1. 固定主机名 `wordeasy-preview.pages.dev` 和 `*.wordeasy-preview.pages.dev` 均绑定 Cloudflare Access；
2. 两个入口都使用默认拒绝策略，身份必须同时是 `Cloudflare Account Member` 并匹配所有者精确邮箱，会话不超过 24 小时；
3. 无身份会话的新浏览器上下文访问根页面、直达路由、`sw.js` 和主 JavaScript 资源时，在内容返回前进入 Access 登录或拒绝响应；
4. 已登录的账户可以打开 Home、完成一次评分并刷新保留进度；
5. 响应包含 local-only CSP、subdomain HSTS、noindex、nosniff、frame denial、Permissions Policy 和 no-referrer，且没有通配 `Access-Control-Allow-Origin`；
6. CSP 不产生浏览器违规，Service Worker 安装和离线重启仍通过；
7. `/cdn-cgi/access/logout` 不被 Service Worker 的 SPA fallback 截获；
8. 默认 cloud production 构建不包含 local-only `_headers`；
9. 若现有 Preview 项目被正式 standalone 替换，部署详情、匿名固定/哈希入口拦截和登录后 UI 都必须证明当前内容是完整 standalone，而不是仍把历史 Preview 当作产品交付。

若固定主机名已保护但哈希部署别名仍匿名可访问，则为 BLOCKER，不得发布。

### TEST-042 · macOS 个人版 DMG

必须分别记录自动证据与真实运行证据：

1. `dist-desktop` 不包含 Service Worker、Manifest、Workbox、Cloudflare `_headers` 或 privileged secret；公开客户端只允许本项目 `VITE_SUPABASE_URL` 与 publishable key，且 key 不得写入 git；
2. 完整 120-card 词库不得进入首屏或 Home 可达 JavaScript；catalog 由云端学习 runtime 在登录后同步，不得再打入 desktop seed chunk；
3. `cargo fmt --check`、Clippy `-D warnings`、Cargo tests（含本项目 Supabase origin 放行与其他远程拒绝）通过；
4. `.app` 与 `.dmg` 均实际生成，主二进制为 `arm64`，identifier 为 `com.nextcenturyhappiness.wordeasy`；
5. ad-hoc `codesign --verify --deep --strict` 与 `hdiutil verify` 通过；
6. DMG 实际挂载，挂载卷内包含应用和 Applications 安装入口；
7. 应用以云端 runtime 启动：未登录时 WebView 内 Email OTP；已有本地 Session 时先显示缓存 Home，不得等待 Supabase 网络；
8. 评分先写入 IndexedDB；同步失败不阻塞学习；退出并重开后本地进度仍保留；
9. CSP / 导航仅放行本地 WebView origin 与本项目 Supabase `https` / `wss` origin；Tauri capability / plugin 清单保持最小，无 shell/fs/http/dialog/updater；
10. 明确记录 Developer ID 签名、Apple 公证和第三方 Mac 分发未验证，不得把 ad-hoc 签名等同于公证。

TEST-042 通过不能替代 TEST-027 的真实 Android Chrome PWA 安装验收。

---

## 11. 发布门槛

只有同时满足以下条件才可发布：

```text
No unresolved BLOCKER
No unexplained HIGH
Format passes
Lint passes
Typecheck passes
Unit tests pass
Component/integration tests pass
Production build passes
Content validation passes
RLS present
No service role key in frontend
Offline review survives refresh
Outbox retry is idempotent
Daily assignments are stable
Research 5+2+3 is correct
Medical 10 is correct
Modules are isolated
Accounts are isolated
Context-first is implemented
PWA assets are generated
Home is not blocked by Supabase
Full vocabulary is not in initial bundle
Reviewers completed v2
```

真实设备或真实 Supabase 场景未执行时，必须明确标记：

```text
Implemented
Automatically verified
Manually verified
Not verified
Deferred
```
