# 06 — Multi-Agent Workflow

## 1. Agent 列表

```text
root_coordinator
backend_sync_agent
frontend_pwa_agent
seed_content_agent
qa_integration_agent
product_learning_reviewer
engineering_security_reviewer
```

---

## 2. Root Coordinator

负责：

- 检查 Git、分支和未提交修改；
- 创建和更新实施计划；
- 分配 Requirement IDs；
- 分配文件所有权；
- 处理共享文件；
- 集成；
- 裁决 Reviewer 问题；
- 运行最终验证；
- 更新 TRACEABILITY；
- 真实、准确地报告未验证场景。

Root 不得只汇总 Agent 的自述，必须检查代码、测试和构建证据。

---

## 3. Backend & Sync Agent

### 必读

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
docs/01_PRODUCT_CORE.md
docs/02_DATA_SYNC_SECURITY.md
docs/05_ACCEPTANCE_TESTS.md
docs/DECISIONS.md
docs/TRACEABILITY.md
```

### 负责 Requirement

```text
AUTH-*
DATA-*
ASSIGN-*
SCHED-*
LOCAL-*
SYNC-*
SEC-*
```

### 主要文件范围

根据仓库实际结构分配，通常包括：

```text
supabase/
src/domain/
src/data/
src/db/
src/sync/
src/auth/
src/scheduler/
tests/data/
```

不得自行修改共享 `package.json`、lockfile 和全局配置；需要时向 Root 提交请求。

### 固定返回格式

```text
Requirement IDs handled
Summary
Files changed
Migrations
Schema and RLS
Sync algorithm
Tests added
Commands run
Results
Risks
Remaining gaps
Shared-file changes requested
```

---

## 4. Frontend & PWA Agent

### 必读

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
docs/01_PRODUCT_CORE.md
docs/03_FRONTEND_PWA_PERFORMANCE.md
docs/05_ACCEPTANCE_TESTS.md
docs/DECISIONS.md
docs/TRACEABILITY.md
```

### 负责 Requirement

```text
UI-*
PWA-*
PERF-*
A11Y-*
```

### 主要文件范围

通常包括：

```text
src/app/
src/routes/
src/components/
src/styles/
src/pwa/
public/
tests/ui/
```

不得绕过数据接口在组件中直接拼 Supabase 查询。

### 固定返回格式

```text
Requirement IDs handled
Routes and components
Files changed
Responsive behavior
Accessibility
PWA configuration
Performance work
Tests added
Commands run
Results
Risks
Remaining gaps
Shared-file changes requested
```

---

## 5. Seed Content Agent

### 必读

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
docs/01_PRODUCT_CORE.md
docs/04_CONTENT_SCHEMA.md
docs/05_ACCEPTANCE_TESTS.md
docs/TRACEABILITY.md
```

### 负责 Requirement

```text
CONTENT-*
```

### 文件范围

```text
data/
scripts/validate-content.*
tests/content/
```

不得修改认证、同步和 UI 架构。

### 固定返回格式

```text
Requirement IDs handled
Counts and category distribution
Files changed
Duplicate checks
Source policy checks
Validation results
Content limitations
```

---

## 6. QA & Integration Agent

### 必读

完整读取所有有效需求文件。

### 权限

可以修复：

- 小范围集成错误；
- 类型错误；
- 构建和测试配置；
- 导入路径；
- 明确回归。

重大架构问题交给 Root，不私自重写。

### 禁止

- 删除失败测试；
- `skip`；
- 弱化断言；
- 关闭 strict；
- 全局关闭 lint；
- 用静态假数据替代真实逻辑。

### 固定返回格式

```text
Executive summary
Commands executed
Pass/fail table
Bugs found
Fixes applied
Remaining blockers
Manual verification required
Files changed
Build result
```

---

## 7. Product & Learning Reviewer

第一轮：

- 只读；
- 不修改代码；
- 不读取 Engineering Reviewer v1；
- 检查实际界面、行为和 60 张卡。

报告：

```text
docs/reviews/product-review-v1.md
```

修复后：

```text
docs/reviews/product-review-v2.md
```

每条发现格式：

```text
ID
Severity: BLOCKER | HIGH | MEDIUM | LOW | NOTE
Requirement
Evidence
File / route / component
Reproduction
User impact
Recommended fix
```

重点：

- 是否真正 Context-first；
- Research 5+2+3；
- Medical 内容均衡；
- 首页是否简单；
- New / Review；
- 移动端操作；
- 中文、英文、IPA；
- 内容准确性；
- 是否虚构来源；
- 是否扩张 Deferred 功能。

---

## 8. Engineering, Security & Performance Reviewer

第一轮：

- 只读；
- 不修改代码；
- 不读取 Product Reviewer v1；
- 运行实际命令并检查源码、migrations、RLS、bundle 和 Service Worker。

报告：

```text
docs/reviews/engineering-review-v1.md
```

修复后：

```text
docs/reviews/engineering-review-v2.md
```

每条发现格式：

```text
ID
Severity
Subsystem
Requirement
Evidence
File and line
Reproduction or attack path
Impact
Recommended fix
```

重点：

- RLS；
- 密钥；
- assignment race；
- outbox 幂等；
- account isolation；
- IndexedDB migration；
- conflict reconciliation；
- bundle；
- 首屏网络瀑布；
- Service Worker 缓存边界；
- 测试可信度。

---

## 9. 并行规则

可并行：

- 仓库探索；
- 需求分析；
- 不重叠目录的实现；
- 测试探索；
- 两位 Reviewer 第一轮。

不可并行写同一文件。

如支持 worktree：

- 每个写代码 Agent 使用独立 worktree；
- Root 合并。

如不支持：

- Read-heavy 并行；
- Write-heavy 串行；
- 共享文件只由 Root 修改。

---

## 10. Review Resolution

Root 创建：

```text
docs/REVIEW_RESOLUTION.md
```

每条发现记录：

```text
Finding ID
Reviewer
Severity
Summary
Disposition
Owner
Fix plan
Files changed
Validation
Re-review result
```

Disposition 只能是：

```text
Accepted
Partially accepted
Rejected with evidence
Deferred by explicit MVP scope
```

不得使用 “Ignored” 或 “Probably fine”。

所有 Accepted 问题必须增加或更新回归测试。

---

## 11. Subagent 启动模板

Root 给每个 Agent 的指令必须包含：

```text
你是 <agent name>。

先读取：
<明确文件列表>

你负责：
<Requirement IDs>

你可以修改：
<目录和文件>

你不得修改：
<共享文件和其他 Agent 范围>

完成前必须运行：
<测试命令>

返回时只给出：
<固定结构化结果>

不要创建下级 Agent。
不要依赖主线程聊天记忆。
```
