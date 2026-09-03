# 00 — Requirements Index

本文件是所有 Agent 的需求导航页。不要依赖聊天记录，也不要默认读取全部文档。

## 1. 当前有效需求文件

| 文件                                  | 内容                                                           | 主要读者                          |
| ------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| `docs/01_PRODUCT_CORE.md`             | 产品目标、Context-first、模块、首页、Today、进度定义、MVP 范围 | 全部 Agent                        |
| `docs/02_DATA_SYNC_SECURITY.md`       | 登录、数据库、FSRS、IndexedDB、离线同步、跨设备、RLS           | Backend、QA、Engineering Reviewer |
| `docs/03_FRONTEND_PWA_PERFORMANCE.md` | 页面、交互、响应式、PWA、macOS 外壳、性能、安全边界和可访问性  | Frontend、QA、两位 Reviewer       |
| `docs/04_CONTENT_SCHEMA.md`           | 120 张 seed cards、内容字段、分类、来源、去重、导入格式        | Content、QA、Product Reviewer     |
| `docs/05_ACCEPTANCE_TESTS.md`         | 自动测试、手工验收、性能测试、发布门槛                         | Root、QA、两位 Reviewer           |
| `docs/06_AGENT_WORKFLOW.md`           | Agent 角色、文件所有权、阶段、独立审查和复审                   | Root、全部 Agent                  |
| `docs/07_MILESTONES.md`               | M0–M4 的具体执行顺序                                           | Root、QA                          |
| `docs/DECISIONS.md`                   | 已锁定技术和产品决策                                           | 全部 Agent                        |
| `docs/TRACEABILITY.md`                | Requirement ID → Owner → Code → Test → Status                  | Root、QA、两位 Reviewer           |
| `docs/CODEX_START_PROMPT.md`          | 用户首次发给 Codex 主 Agent 的执行提示词                       | 用户、Root                        |

## 2. Requirement ID 前缀

| 前缀        | 范围                           |
| ----------- | ------------------------------ |
| `CORE-*`    | 产品核心和 Context-first       |
| `RES-*`     | Research English               |
| `MED-*`     | Medical English                |
| `SCOPE-*`   | MVP 与 Deferred                |
| `AUTH-*`    | 登录和 Session                 |
| `DATA-*`    | 云端数据库结构                 |
| `ASSIGN-*`  | Daily assignment               |
| `SCHED-*`   | FSRS 和 Review state           |
| `LOCAL-*`   | IndexedDB 和本地状态           |
| `SYNC-*`    | 离线队列和跨设备同步           |
| `SEC-*`     | RLS、密钥和数据隔离            |
| `UI-*`      | 页面和交互                     |
| `PWA-*`     | Manifest、Service Worker、安装 |
| `DESKTOP-*` | macOS Tauri 包装与个人版边界   |
| `PERF-*`    | 启动和 bundle 性能             |
| `A11Y-*`    | Accessibility                  |
| `CONTENT-*` | Seed card 和内容质量           |
| `TEST-*`    | 验收和发布门槛                 |

## 3. 优先级

- **P0**：MVP 发布前必须完成。
- **P1**：应完成，但可在不破坏 P0 的情况下调整。
- **Deferred**：本次不得实现，也不要创建空页面或假按钮。

## 4. Agent 阅读矩阵

### Root Coordinator

必须读取：

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
docs/01_PRODUCT_CORE.md
docs/06_AGENT_WORKFLOW.md
docs/07_MILESTONES.md
docs/DECISIONS.md
docs/TRACEABILITY.md
```

进入某个子系统前再读取对应领域文件。发布前完整读取 `docs/05_ACCEPTANCE_TESTS.md`。

### Backend & Sync Agent

读取：

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
docs/01_PRODUCT_CORE.md
docs/02_DATA_SYNC_SECURITY.md
docs/05_ACCEPTANCE_TESTS.md
docs/DECISIONS.md
docs/TRACEABILITY.md
```

### Frontend & PWA Agent

读取：

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
docs/01_PRODUCT_CORE.md
docs/03_FRONTEND_PWA_PERFORMANCE.md
docs/05_ACCEPTANCE_TESTS.md
docs/DECISIONS.md
docs/TRACEABILITY.md
```

### Seed Content Agent

读取：

```text
AGENTS.md
docs/00_REQUIREMENTS_INDEX.md
docs/01_PRODUCT_CORE.md
docs/04_CONTENT_SCHEMA.md
docs/05_ACCEPTANCE_TESTS.md
docs/TRACEABILITY.md
```

### QA & Integration Agent

完整读取：

```text
docs/01_PRODUCT_CORE.md
docs/02_DATA_SYNC_SECURITY.md
docs/03_FRONTEND_PWA_PERFORMANCE.md
docs/04_CONTENT_SCHEMA.md
docs/05_ACCEPTANCE_TESTS.md
docs/DECISIONS.md
docs/TRACEABILITY.md
```

### Product & Learning Reviewer

读取：

```text
docs/01_PRODUCT_CORE.md
docs/03_FRONTEND_PWA_PERFORMANCE.md
docs/04_CONTENT_SCHEMA.md
docs/05_ACCEPTANCE_TESTS.md
docs/TRACEABILITY.md
```

### Engineering, Security & Performance Reviewer

读取：

```text
docs/01_PRODUCT_CORE.md
docs/02_DATA_SYNC_SECURITY.md
docs/03_FRONTEND_PWA_PERFORMANCE.md
docs/05_ACCEPTANCE_TESTS.md
docs/TRACEABILITY.md
```

第一轮不得读取 Product Reviewer 的报告。

## 5. 变更规则

修改需求时必须同时：

1. 更新对应需求文件；
2. 保留 Requirement ID，除非需求被明确删除；
3. 更新 `docs/DECISIONS.md`；
4. 更新 `docs/TRACEABILITY.md`；
5. 检查对应测试是否需要修改。
