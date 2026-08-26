# 07 — Milestones

## M0 — Baseline and planning

1. 检查 Git 状态、分支、未提交修改和目录。
2. 不覆盖用户代码，不 destructive reset。
3. 运行现有 lint、typecheck、test、build。
4. 创建 `docs/IMPLEMENTATION_PLAN.md`。
5. 在 `docs/TRACEABILITY.md` 中确认所有 P0 Requirement ID 和 owner。
6. 分配文件所有权。
7. 创建安全 checkpoint。

完成条件：

- baseline 已记录；
- 文件所有权明确；
- 无关键需求无 owner；
- 尚未大规模写生产代码。

---

## M1 — Local vertical slice

目标：

```text
Demo/local session
→ Home
→ Research Today
→ Context Card
→ Good
→ IndexedDB
→ 刷新后进度保留
```

必须包含：

- Context-first UI；
- 正反面；
- Research Today；
- 本地 event/state/summary/outbox；
- 模块数据结构；
- 评分防重复；
- 基础单元和组件测试。

M1 不要求真实 Supabase 跨设备完成，但数据接口不能写死为纯 demo。

完成后：

- lint；
- typecheck；
- relevant tests；
- production build；
- 更新 TRACEABILITY；
- Git checkpoint。

---

## M2 — Cloud, assignment and review

实现：

- Supabase Email OTP；
- migrations；
- RLS；
- Research 5+2+3；
- Medical 10；
- stable daily assignment；
- daily Review queue；
- FSRS adapter；
- outbox push/pull；
- 幂等 event；
- account isolation；
- conflict reconciliation；
- real or local Supabase integration tests。

完成后执行对应 TEST-003 至 TEST-024。

---

## M3 — PWA and performance

实现：

- Manifest；
- icons；
- Service Worker；
- offline App Shell；
- offline cached cards；
- route code splitting；
- Home 不等待 Supabase；
- no remote fonts；
- performance marks；
- bundle script；
- 10,000 events benchmark；
- Android / macOS responsive；
- Light / Dark；
- accessibility。

完成后执行 TEST-025 至 TEST-033。

---

## M4 — Content, QA, review and release

1. 完成 60 张 seed cards 和校验。
2. QA 运行完整测试。
3. 两位 Reviewer 第一轮独立只读审查。
4. Root 建立 REVIEW_RESOLUTION。
5. Agent 修复 Accepted 问题并增加回归测试。
6. 完整回归。
7. 两位 Reviewer 第二轮复审。
8. 检查发布门槛。
9. 更新 README、TRACEABILITY 和最终状态。

没有完成 Reviewer v2，不得宣称 MVP 完成。
