# Traceability

状态只能使用：

```text
Planned
In progress
Implemented
Automatically verified
Manually verified
Not verified
Deferred
Blocked
```

Root Coordinator 在每个里程碑结束时更新。

M0 note (2026-08-26): all P0 requirements have an owner and planned implementation/test location. The repository initially contained no runnable application, so no implementation row is marked verified at baseline.

| Requirement | Priority | Owner                | Implementation                                       | Test / verification      | Status      |
| ----------- | -------: | -------------------- | ---------------------------------------------------- | ------------------------ | ----------- |
| CORE-001    |       P0 | Frontend + Backend   | `src/domain/content.ts`, `src/components/card/`      | TEST-002                 | Planned     |
| CORE-002    |       P0 | Backend              | `src/domain/content.ts`, public-content migrations   | TEST-002                 | Planned     |
| CORE-003    |       P0 | Frontend             | `src/components/card/ContextCardFront.tsx`           | TEST-002                 | Planned     |
| CORE-004    |       P0 | Frontend + Content   | `src/components/card/ContextCardBack.tsx`, seed data | TEST-002, TEST-037       | Planned     |
| CORE-005    |       P0 | Backend + Frontend   | module domain, scoped repositories, module routes    | TEST-006                 | Planned     |
| CORE-006    |       P0 | Backend + Frontend   | progress domain, daily summary, Today UI             | TEST-005                 | Planned     |
| CORE-007    |       P0 | Frontend + Scheduler | rating domain, controls, FSRS adapter                | TEST-015                 | Planned     |
| CORE-008    |       P0 | Backend              | learned-word-sense materialization                   | unit test                | Planned     |
| CORE-009    |       P0 | Backend              | study-day materialization and timezone service       | TEST-014                 | Planned     |
| CORE-010    |       P0 | Root                 | project-wide release gate                            | release gate             | In progress |
| RES-001     |       P0 | Backend              | assignment service and RPC                           | TEST-003                 | Planned     |
| RES-002     |       P0 | Content              | `data/seed-data.json`                                | Product review           | Planned     |
| RES-003     |       P0 | Backend + Frontend   | structured shortage domain/RPC/UI                    | TEST-013                 | Planned     |
| MED-001     |       P0 | Backend              | Medical assignment service and RPC                   | TEST-004                 | Planned     |
| MED-002     |       P0 | Content              | Medical seed distribution                            | TEST-034, TEST-037       | Planned     |
| MED-003     |       P1 | Content              | Medical context genres in seed data                  | Product review           | Planned     |
| SCOPE-001   |       P0 | Root                 | project-wide                                         | release gate             | In progress |
| SCOPE-002   | Deferred | Root                 | no implementation                                    | repository review        | Deferred    |
| AUTH-001    |       P0 | Backend + Frontend   | Auth gateway, Supabase adapter, Login route          | auth tests               | Planned     |
| AUTH-002    |       P0 | Backend + Frontend   | Auth gateway/state machine and Login UI              | auth tests               | Planned     |
| AUTH-003    |       P0 | Backend + Frontend   | local bootstrap and background session validation    | TEST-030                 | Planned     |
| DATA-001    |       P0 | Backend              | public-content migrations                            | migration tests          | Planned     |
| DATA-002    |       P0 | Backend              | private-learning migrations                          | migration tests          | Planned     |
| DATA-003    |       P0 | Backend              | constraints/index migrations                         | database tests           | Planned     |
| DATA-004    |       P0 | Backend + Root       | explicit demo adapter and mode config                | build/docs               | Planned     |
| ASSIGN-001  |       P0 | Backend              | timezone service and assignment RPC                  | TEST-014                 | Planned     |
| ASSIGN-002  |       P0 | Backend              | stable assignment sets/repository                    | TEST-011                 | Planned     |
| ASSIGN-003  |       P0 | Backend              | Research quota selector/RPC                          | TEST-003                 | Planned     |
| ASSIGN-004  |       P0 | Backend              | Medical balanced selector/RPC                        | TEST-004                 | Planned     |
| ASSIGN-005  |       P0 | Backend              | prior-assignment exclusion                           | unit test                | Planned     |
| ASSIGN-006  |       P0 | Backend              | locked assignment RPC/migration                      | TEST-012                 | Planned     |
| ASSIGN-007  |       P0 | Backend              | stable daily review assignment sets                  | TEST-005                 | Planned     |
| SCHED-001   |       P0 | Backend              | pinned `ts-fsrs` dependency                          | scheduler tests          | Planned     |
| SCHED-002   |       P0 | Backend              | `src/scheduler/fsrsAdapter.ts`                       | architecture test/review | Planned     |
| SCHED-003   |       P0 | Backend              | local/cloud review-state repositories                | sync tests               | Planned     |
| LOCAL-001   |       P0 | Backend              | Dexie schema and scoped repository                   | TEST-007, TEST-008       | Planned     |
| LOCAL-002   |       P0 | Backend              | account-scoped DB keys/repository                    | TEST-024                 | Planned     |
| LOCAL-003   |       P0 | Backend              | Dexie version migrations                             | TEST-010                 | Planned     |
| LOCAL-004   |       P0 | Backend              | indexed `daily_summary` repository                   | TEST-031                 | Planned     |
| SYNC-001    |       P0 | Backend              | atomic local rating use case                         | TEST-007, TEST-015       | Planned     |
| SYNC-002    |       P0 | Backend              | immutable review-event domain/schema                 | unit test                | Planned     |
| SYNC-003    |       P0 | Backend              | idempotent ingest RPC/client                         | TEST-016                 | Planned     |
| SYNC-004    |       P0 | Backend              | outbox repository/state machine                      | TEST-017                 | Planned     |
| SYNC-005    |       P0 | Backend              | sync coordinator and lock                            | TEST-018                 | Planned     |
| SYNC-006    |       P0 | Backend              | push/pull merge pipeline                             | integration test         | Planned     |
| SYNC-007    |       P0 | Backend              | review event log and ingest RPC                      | TEST-019                 | Planned     |
| SYNC-008    |       P0 | Backend              | revision CAS and application metadata                | TEST-019                 | Planned     |
| SYNC-009    |       P0 | Backend              | deterministic per-card reconciler                    | TEST-019                 | Planned     |
| SYNC-010    |       P1 | Backend              | clock anomaly policy in sync protocol                | conflict tests           | Planned     |
| SEC-001     |       P0 | Backend              | migrations                                           | TEST-021                 | Planned     |
| SEC-002     |       P0 | Backend              | migrations                                           | RLS tests                | Planned     |
| SEC-003     |       P0 | Backend              | migrations                                           | TEST-022                 | Planned     |
| SEC-004     |       P0 | Backend              | RPC/policies                                         | TEST-021                 | Planned     |
| SEC-005     |       P0 | Root + Backend       | env/build                                            | TEST-023                 | Planned     |
| SEC-006     |       P0 | All                  | logging                                              | code review              | Planned     |
| SEC-007     |       P0 | QA                   | secret scan                                          | TEST-023                 | Planned     |
| UI-001      |       P0 | Frontend             | `src/routes/home/`                                   | component/E2E            | Planned     |
| UI-002      |       P0 | Frontend             | `src/routes/today/`, progress components             | TEST-005                 | Planned     |
| UI-003      |       P0 | Frontend             | rating controls and Study state machine              | TEST-015                 | Planned     |
| UI-004      |       P1 | Frontend             | style tokens and responsive layout                   | Product review           | Planned     |
| UI-005      |       P0 | Frontend             | `src/routes/login/`                                  | auth UI tests            | Planned     |
| UI-006      |       P0 | Frontend             | local-first Home/bootstrap                           | TEST-030                 | Planned     |
| UI-007      |       P0 | Frontend             | Today state matrix                                   | component tests          | Planned     |
| UI-008      |       P0 | Frontend             | `ContextCardFront.tsx`                               | TEST-002                 | Planned     |
| UI-009      |       P0 | Frontend             | `ContextCardBack.tsx`                                | TEST-002                 | Planned     |
| UI-010      |       P0 | Frontend             | guarded rating controls                              | TEST-015                 | Planned     |
| UI-011      |       P0 | Frontend             | mobile responsive CSS                                | mobile E2E               | Planned     |
| UI-012      |       P0 | Frontend             | desktop layout/keyboard                              | desktop E2E              | Planned     |
| UI-013      |       P0 | Frontend             | theme bootstrap/settings                             | theme tests              | Planned     |
| UI-014      |       P1 | Frontend             | dependency/CSS architecture                          | Product review           | Planned     |
| PWA-001     |       P0 | Frontend             | Vite PWA manifest and icons                          | TEST-025                 | Planned     |
| PWA-002     |       P0 | Frontend + QA        | production install assets/verification               | TEST-027                 | Planned     |
| PWA-003     |       P0 | Frontend             | generated SW configuration                           | TEST-026                 | Planned     |
| PWA-004     |       P0 | Frontend             | prompt update coordinator                            | update test              | Planned     |
| PERF-001    |       P0 | Frontend             | system-font CSS/local icons                          | TEST-033                 | Planned     |
| PERF-002    |       P0 | Frontend + Backend   | bootstrap pipeline                                   | TEST-030                 | Planned     |
| PERF-003    |       P0 | Frontend             | lazy remote adapters/startup                         | waterfall inspection     | Planned     |
| PERF-004    |       P0 | Frontend             | App Shell/error boundaries                           | TEST-030                 | Planned     |
| PERF-005    |       P0 | Frontend             | lazy route/chunk configuration                       | TEST-032                 | Planned     |
| PERF-006    |       P0 | Frontend + Content   | controlled import; no browser seed import            | TEST-033                 | Planned     |
| PERF-007    |       P0 | Backend + Frontend   | indexed summary-only Home query                      | TEST-031                 | Planned     |
| PERF-008    |       P0 | Frontend             | performance marks/measures                           | performance test         | Planned     |
| PERF-009    |       P0 | QA                   | N/A                                                  | TEST-028                 | Planned     |
| PERF-010    |       P0 | QA                   | N/A                                                  | TEST-029                 | Planned     |
| PERF-011    |       P0 | Frontend + QA        | bundle/precache budget script                        | TEST-032                 | Planned     |
| PERF-012    |       P0 | QA                   | N/A                                                  | TEST-028, TEST-029       | Planned     |
| A11Y-001    |       P0 | Frontend             | semantic UI, focus, live regions, reduced motion     | accessibility tests      | Planned     |
| CONTENT-001 |       P0 | Content              | `data/seed-data.json`                                | TEST-034                 | Planned     |
| CONTENT-002 |       P0 | Content              | `data/seed-data.json`                                | TEST-034, TEST-037       | Planned     |
| CONTENT-003 |       P0 | Content              | data schema                                          | TEST-036                 | Planned     |
| CONTENT-004 |       P0 | Content              | seed data                                            | TEST-035                 | Planned     |
| CONTENT-005 |       P0 | Content              | seed data                                            | TEST-037                 | Planned     |
| CONTENT-006 |       P0 | Content              | seed data                                            | TEST-037                 | Planned     |
| CONTENT-007 |       P0 | Content              | seed data                                            | TEST-037                 | Planned     |
| CONTENT-008 |       P0 | Content              | seed data                                            | TEST-036, TEST-037       | Planned     |
| CONTENT-009 |       P0 | Content              | validator                                            | content tests            | Planned     |
| CONTENT-010 |       P0 | Content              | data/scripts                                         | file check               | Planned     |
| CONTENT-011 |       P0 | Content              | validator                                            | content tests            | Planned     |
| CONTENT-012 | Deferred | Root                 | no UI                                                | repository review        | Deferred    |
