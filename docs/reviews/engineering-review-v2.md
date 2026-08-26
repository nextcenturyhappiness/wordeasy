# Engineering, Security & Performance Review v2

- Date: 2026-08-26
- Reviewer: `engineering_cleanroom_reviewer` (the original v1 reviewer)
- Mode: clean-room read-only re-review; no repository files modified
- Scope: all ENG-V1 dispositions and remediation, security/trust boundaries, synchronization, IndexedDB migration, PWA/offline behavior, performance, and final local gates

## Verdict

**PASS WITH EXTERNAL GAPS**

All local BLOCKER and HIGH findings are closed. ENG-V1-008 and ENG-V1-009 remain partial only because their real Supabase, network, and device scenarios were unavailable; the local implementation and evidence claimed for those rows pass. No new finding remains.

## v1 finding closure

| Finding    | Result  | Re-review evidence                                                                                                                                                                                               |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENG-V1-001 | Closed  | Repository-wide `npm run format:check` passes.                                                                                                                                                                   |
| ENG-V1-002 | Closed  | Account sync pushes, pulls, and reconciles before first assignment creation, then performs the final bounded pass; pending-drain and midnight-transition regressions pass.                                       |
| ENG-V1-003 | Closed  | Hardening revokes browser canonical-state commits. The Edge worker alone uses server credentials and trusted RPCs. Direct executable Edge replay now matches the browser FSRS adapter in a golden parity test.   |
| ENG-V1-004 | Closed  | A state skipped because its card has active outbox evidence is added to durable pending reconciliation in the same transaction as cursor advancement; restart, duplicate acknowledgement, and final commit pass. |
| ENG-V1-005 | Closed  | The hardened ingest validates New/Review assignment membership, module, card, date, and timezone under the shared advisory lock; invalid historical evidence is excluded.                                        |
| ENG-V1-006 | Closed  | IndexedDB v3 adds bounded claim/lease/module/card indexes and card-scoped outbox rows. The 10,000-active-outbox regression claims only 100 candidates and avoids joining full event history for conflict checks. |
| ENG-V1-007 | Closed  | The production-entry harness renders preseeded Cached Home before five-second delayed Supabase requests and preserves it when those requests fail.                                                               |
| ENG-V1-008 | Partial | Production App Shell offline and the controlled cached-learning/rating/reload/three-outbox flow pass. Exactly-once upload after reconnecting a real authenticated account remains Not verified.                  |
| ENG-V1-009 | Partial | SQL/RPC/RLS static coverage is strengthened, but no Supabase CLI/Postgres runtime was available for real user-A/B policy and RPC attack execution.                                                               |

## Remediation-specific evidence

- IndexedDB v2 → v3 backfill proves every outbox row against its immutable event; an orphan or mismatched link aborts and rolls back the version-change transaction.
- Due pending/failed rows and expired syncing leases are selected through compound indexes; the exact inclusive lease boundary has a regression test.
- Candidate memory is bounded to at most three status-specific `limit` sets before the final batch limit.
- Canonical state skipped at an unchanged state epoch remains durable after the state cursor advances and converges after restart plus duplicate acknowledgement.
- `tests/scheduler/edgeFsrsReplay.test.ts` imports and executes the production Edge replay implementation, covers stable tie ordering, and compares its serialized state/due date with the browser adapter.

## Independent evidence rerun

| Evidence                   | Result                                                         |
| -------------------------- | -------------------------------------------------------------- |
| `npm run format:check`     | PASS                                                           |
| `npm run lint`             | PASS                                                           |
| `npm run typecheck`        | PASS, app + Edge strict TypeScript                             |
| remediation-specific tests | PASS, 6 files / 25 tests                                       |
| `npm test`                 | PASS, 30 files / 142 tests                                     |
| `npm run build`            | PASS, 125 modules; production PWA restored                     |
| `npm run test:perf`        | PASS, 10,000-active-outbox regression                          |
| `npm run test:bundle`      | PASS, initial 77.08 KiB and Home 113.97 KiB gzip               |
| `npm run test:pwa`         | PASS                                                           |
| `npm run test:secrets`     | PASS                                                           |
| `npm run test:e2e`         | PASS, 8/8                                                      |
| `npm run test:pwa:offline` | PASS, production App Shell 1/1 and cached learning 1/1         |
| `npm run test:perf:e2e`    | PASS, production cloud 2/2 and three-run synthetic fixture 1/1 |
| `git diff --check`         | PASS                                                           |
| `npm run test:db`          | NOT VERIFIED, exit 127: `supabase: command not found`          |

The reviewer's independent performance run recorded cold FCP/LCP 864 ms, INP 40 ms, and CLS 0; warm App Shell 107.8 ms, Cached Home 181.2 ms, and Home-to-card 150.6 ms. The App Shell mark followed FCP, confirming the Paint Timing fix in that run.

## New findings

None.

## Remaining external verification

- apply migrations and execute real user-A/B RLS, immutable-event, and RPC permission attacks;
- concurrent Postgres assignment/membership/advisory-lock execution;
- deployed `review-sync`, trusted replay, and coordinated-upgrade behavior;
- two real clients under timeout retry, conflict, assignment, and progress convergence;
- real OTP and session expiry/restore/logout;
- exactly-once outbox upload after a real reconnect;
- Android/macOS installation and standalone launch, physical keyboard/safe area, and a real screen reader;
- Cloudflare Pages production origin and Supabase Auth configuration.

Engineering Review passes the engineering portion of TEST-040 and recommends a local release-candidate handoff. It does not recommend claiming complete production acceptance until the external gaps above are verified.
