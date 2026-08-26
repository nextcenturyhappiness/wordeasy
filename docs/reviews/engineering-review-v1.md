# Engineering, Security & Performance Review v1

- Date: 2026-08-26
- Mode: strict clean-room, independent, read-only first review
- Reviewer: `engineering_cleanroom_reviewer` (`fork_turns=none`)

## Executive summary

The current version does not pass the release gate.

- One BLOCKER: `format:check` failed on two forbidden review files whose contents were not opened.
- Three HIGH findings: Review queues freeze before outbox upload; the cloud trusts client-provided canonical FSRS state; and reconciliation state changes can be missed permanently because pull has only an event cursor.
- Five MEDIUM findings: cloud events do not prove assignment membership; historical outbox scans are unbounded; performance uses a demo fixture; offline PWA E2E proves only the configuration shell; and RLS tests inspect SQL text without executing policies.
- Positive evidence: lint, typecheck, 115 Vitest tests, production build, bundle/PWA/secret checks, six browser E2E cases, offline App Shell, and three-run synthetic performance checks passed.

The reviewer did not read `docs/reviews/**`, `docs/REVIEW_RESOLUTION.md`, another report, or prior Agent history.

## Commands executed

| Command                             | Result                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `npm run format:check`              | FAIL; two `docs/reviews/*.md` files reported, contents not inspected    |
| `npm run lint`                      | PASS                                                                    |
| `npm run typecheck`                 | PASS                                                                    |
| `npm test`                          | PASS, 28 files / 115 tests                                              |
| `npm run build`                     | PASS, final production output restored                                  |
| `npm run test:bundle`               | PASS                                                                    |
| `npm run test:pwa`                  | PASS                                                                    |
| `npm run test:secrets`              | PASS, 161 tracked + 103 production-relevant files                       |
| `npm run test:e2e`                  | Initial sandbox `EPERM`; approved rerun PASS, 6/6                       |
| `npm run test:pwa:offline`          | PASS, 1/1; scope limitation recorded below                              |
| `npm run build:performance-fixture` | PASS                                                                    |
| `npm run test:perf:e2e`             | PASS, three cold and three warm runs; fixture limitation recorded below |
| Live DB/RLS tests                   | NOT VERIFIED; Supabase CLI/Docker unavailable                           |

## Findings

### ENG-V1-001

- Severity: BLOCKER
- Subsystem: Release gate / formatting
- Requirement: TEST-001, release gate
- Evidence: `npm run format:check` exited 1.
- File and line: two files under `docs/reviews/`; lines not inspected due clean-room prohibition.
- Reproduction or attack path: run `npm run format:check`.
- Impact: the explicit format release gate fails.
- Recommended fix: format the reported files and rerun the gate without weakening Prettier coverage.

### ENG-V1-002

- Severity: HIGH
- Subsystem: Sync / stable Review assignments
- Requirement: ASSIGN-007, SYNC-005, SYNC-006, TEST-008, TEST-011, TEST-020
- Evidence: `AccountSyncGateway` syncs settings and refreshes both day caches before invoking the push/pull coordinator. Day-cache refresh freezes New and Review assignments.
- File and line: `src/sync/accountSyncGateway.ts`, `src/data/cloud/cloudDayCache.ts`, `supabase/migrations/20260826000200_assignment_rpcs.sql`
- Reproduction or attack path: rate a card offline late on day 1 so its pending event makes it due on day 2. On day 2 reconnect, the client freezes the cloud Review queue from stale `review_states`, then uploads the event. The due card cannot enter the stable queue.
- Impact: legitimately due reviews can be omitted for the entire day and push-before-pull semantics are violated.
- Recommended fix: push/reconcile all eligible outbox events before creating/fetching daily assignments, then pull/merge. Add a midnight offline-to-online integration test.

### ENG-V1-003

- Severity: HIGH
- Subsystem: Scheduler integrity / RPC security
- Requirement: SCHED-003, SYNC-008, SYNC-009
- Evidence: `ingest_review_events` accepts client-provided `scheduler_after` and `due_at` and writes them directly to `review_states`. `commit_reconciled_review_state` accepts arbitrary scheduler JSON and due dates; CAS verifies only revision and event-set hash.
- File and line: `supabase/migrations/20260826000300_review_sync_rpcs.sql`
- Reproduction or attack path: an authenticated modified client obtains a valid reconciliation hash/revision, then calls the granted commit RPC with arbitrary scheduler state and a far-future due date.
- Impact: a defective or hostile client can corrupt canonical scheduling inside its own account and defeat deterministic replay.
- Recommended fix: construct/replay canonical state at a trusted server/Edge boundary, or independently verify submitted state against replayed events before commit. Do not expose an RPC that trusts browser-provided canonical state.

### ENG-V1-004

- Severity: HIGH
- Subsystem: Cross-device reconciliation recovery
- Requirement: SYNC-007, SYNC-009, TEST-019, TEST-020
- Evidence: pull pagination is cursor-based only on immutable Review events. States are returned only for current-page events or currently pending conflicts. The local cursor is persisted before reconciliation; reconciliation updates state/application rows without a new cursor-visible event.
- File and line: `supabase/migrations/20260826000300_review_sync_rpcs.sql`, `src/sync/dexieSyncStore.ts`, `src/sync/syncCoordinator.ts`
- Reproduction or attack path: client A merges a conflict page and persists its cursor, then crashes before reconciliation. Client B reconciles the card. On restart A has no new event to pull and the conflict is no longer pending, so A never receives canonical state.
- Impact: one device can retain a stale Review state indefinitely.
- Recommended fix: add a state-change cursor/log with a stable tie-breaker, or persist unresolved conflict work locally before advancing the event cursor. Add a crash/restart test between merge and reconciliation.

### ENG-V1-005

- Severity: MEDIUM
- Subsystem: Cloud event integrity
- Requirement: ASSIGN-002, ASSIGN-005, SYNC-002, CORE-006
- Evidence: ingest validates active card/module/sense but not that the card belongs to the specified user's date and queue assignment. A `new` event immediately materializes `learned_word_senses`.
- File and line: `supabase/migrations/20260826000300_review_sync_rpcs.sql`
- Reproduction or attack path: an authenticated caller submits a well-shaped `new` event for any active card without having that assignment.
- Impact: a modified client can inflate learned-word state and bypass stable assignment semantics within its account.
- Recommended fix: require a matching New or Review assignment row for user, module, date, card, and queue before accepting an event; add negative RPC tests.

### ENG-V1-006

- Severity: MEDIUM
- Subsystem: IndexedDB / long-term performance
- Requirement: PERF-002, PERF-003, PERF-007, TEST-031
- Evidence: synced outbox rows remain. Claim, pending-count, and summary-refresh paths load all account outbox rows and filter in JavaScript; summary refresh rewrites every daily summary. The 10,000-event benchmark inserts only `local_review_events` and times `getCachedHome`, missing startup sync scans.
- File and line: `src/sync/dexieSyncStore.ts`, `tests/performance/homeSummary.test.ts`
- Reproduction or attack path: retain 10,000 synced outbox rows, then launch/focus the app.
- Impact: background startup sync becomes O(all historical outbox rows).
- Recommended fix: query compound status indexes, prune/archive acknowledged outbox rows, update only affected summaries, and benchmark a fresh runtime with realistic event/outbox history.

### ENG-V1-007

- Severity: MEDIUM
- Subsystem: Performance test validity
- Requirement: PERF-009, PERF-010, PERF-012, TEST-028, TEST-029, TEST-030
- Evidence: performance mode replaces the production entry with a fixture importing `createDemoRuntime`; cloud bootstrap, Supabase delay/failure, and the production waterfall are absent.
- File and line: `vite.config.ts`, `tests/performance/performanceMain.tsx`, `tests/e2e/performance.spec.ts`
- Reproduction or attack path: build performance mode and inspect the generated runtime entry.
- Impact: passing metrics do not establish that production Home is unblocked by Supabase.
- Recommended fix: add a production-cloud harness with deterministic five-second/failing Supabase interception and a preseeded authenticated local cache; capture waterfall and long tasks.

Synthetic medians observed in the limited fixture:

| Metric            |      Cold |     Warm |
| ----------------- | --------: | -------: |
| FCP               |    864 ms |   104 ms |
| LCP               |    864 ms |   104 ms |
| INP approximation |     56 ms |    40 ms |
| CLS               |         0 |        0 |
| App Shell         |  778.1 ms |  41.1 ms |
| Cached Home       | 1274.3 ms | 137.2 ms |
| Home → first card |  447.9 ms | 122.9 ms |

### ENG-V1-008

- Severity: MEDIUM
- Subsystem: Offline/PWA test validity
- Requirement: PWA-003, TEST-008, TEST-026, TEST-030
- Evidence: production offline E2E expects the configuration-failure shell before and after offline. Demo reload persistence never disables networking.
- File and line: `tests/e2e/pwaOffline.spec.ts`, `tests/e2e/localLearning.spec.ts`
- Reproduction or attack path: run `test:pwa:offline`; it passes without authenticating, caching an assignment, rating offline, reopening, or syncing the outbox.
- Impact: Offline App Shell is proven, but authenticated offline learning and retry idempotency are not proven end-to-end.
- Recommended fix: preseed account-scoped production cache/session, rate and restart offline, restore connectivity, and assert one cloud event per UUID.

### ENG-V1-009

- Severity: MEDIUM
- Subsystem: RLS/security test validity
- Requirement: SEC-001..004, TEST-021, TEST-022
- Evidence: migration tests import raw SQL and assert text fragments; no policy/function runs as authenticated users A and B.
- File and line: `tests/db/migrations.test.ts`
- Reproduction or attack path: a syntactically invalid or ineffective policy can still satisfy substring assertions.
- Impact: cross-account denial, event immutability, and RPC privileges are not automatically verified in Postgres.
- Recommended fix: execute migrations in disposable Supabase/Postgres and test A/B SELECT/INSERT/UPDATE/DELETE and direct RPC attacks. Retain text checks only as fast structural tests.

## Pass/fail summary

| Area                       | Result                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| AUTH                       | Implemented/unit tested; real OTP/session expiry unverified                                 |
| DATA / ASSIGN / SYNC / SEC | Migrations present; three HIGH integrity/order issues and no live DB evidence               |
| LOCAL                      | Dexie schema/migration/atomic rating/account scope pass; long-history sync path needs work  |
| PWA                        | Generated assets/offline shell pass; real install and authenticated offline flow unverified |
| PERF                       | Bundle/synthetic medians pass; production cloud startup evidence incomplete                 |
| TEST-038                   | PASS; strict clean-room, read-only, no report access                                        |
| TEST-039..040              | Pending for resolution and v2                                                               |

## Remaining blockers

- Fix formatting.
- Resolve ENG-V1-002, ENG-V1-003, and ENG-V1-004 before release.
- Execute live Postgres/Supabase RLS and RPC attack tests.
- Do not mark TEST-008, TEST-020, TEST-021, TEST-022, TEST-027, TEST-030, or full PERF-012 verified from current evidence.

## Manual verification required

- Real Email OTP, resend, expiry, logout, and session restoration.
- Two clients with identical assignments, outbox retry, and conflict reconciliation.
- Android/macOS install and standalone launch.
- Authenticated cached Home and rating across offline restart.
- Screen reader, keyboard focus, contrast, mobile keyboard, and safe areas.
- Production cloud DevTools/Lighthouse waterfall under Slow 4G, 4× CPU, and Supabase delay/failure.

## Files changed

None. Only ignored build/test artifacts were generated.

## Build result

Production build PASS and final production artifacts restored. Bundle budgets, PWA static checks, and secret scan passed.
