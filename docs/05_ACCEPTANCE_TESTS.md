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
- reveal 后背面信息完整；
- Review state 绑定 card，不只绑定 lemma。

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
- UTC 日期不同但 profile study_date 相同；
- 一个存在 DST 的 IANA timezone。

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
Research = 30
General = 15
Statistics = 6
Bioinformatics = 9
Medical = 30
Total = 60
```

### TEST-035 · 来源

原创例句不带伪造 DOI、PMID、期刊或标题。

### TEST-036 · 内容字段

每张卡必填字段完整，target text 出现在 context 中，collocations 非空。

### TEST-037 · 人工抽查

Product Reviewer 抽查 60 张卡的：

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
