# Product & Learning Review v2

- Date: 2026-08-26
- Reviewer: `product_learning_reviewer` (the original v1 reviewer)
- Mode: independent read-only re-review; no repository files modified
- Scope: v1 dispositions and fixes, canonical content/demo parity, both module flows, traceability, TEST-009, and the final local regression evidence

## Verdict

**PASS WITH EXTERNAL GAPS**

The local product, learning, content, and UI evidence is complete. PLR-V1-001 through PLR-V1-004 are closed, the direct TEST-009 evidence gap found during v2 was remediated and rechecked, and no new BLOCKER, HIGH, or MEDIUM finding remains.

## v1 finding closure

| Finding    | Result | Re-review evidence                                                                                                                                                                      |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PLR-V1-001 | Closed | The default demo provides a stable Medical 10-card New assignment as well as Research 5+2+3. Unit and dual-project browser E2E cover rating, reload persistence, and module isolation.  |
| PLR-V1-002 | Closed | Demo cards are emitted from a controlled subset of canonical `data/seed-data.json`; parity and bundle checks prevent the full or demo vocabulary from entering initial production code. |
| PLR-V1-003 | Closed | `TRACEABILITY.md` and `RELEASE_VERIFICATION.md` now reflect the current implementation and measured evidence while retaining external scenarios as Not verified.                        |
| PLR-V1-004 | Closed | The rejected disposition is supported: CONTENT-010 requires canonical JSON, a flat import-template CSV, and validation; it does not require a duplicate full CSV that could drift.      |

## TEST-009 recheck

The reviewer initially identified a MEDIUM evidence gap because the uncached-offline behavior lacked a direct component regression. Root added and the reviewer inspected three tests:

- Home null-cache: explicit connect/no-replacement message, no invented module assignment cards, and no assignment or queue lookup;
- Today rejected read: explicit stable-assignment/no-replacement message, no Continue action, and no substitute queue lookup;
- Study rejected queue read: no Context Card, reveal control, rating controls, or rating call.

These tests match the corresponding production branches. `npm run test:component -- --run` independently passed 7 files and 32 tests, and the TEST-009 traceability row now names the direct evidence. The proposed v2 finding is therefore closed and is not an outstanding finding.

## Independent evidence rerun

| Evidence                                    | Result               |
| ------------------------------------------- | -------------------- |
| `npm run content:validate`                  | PASS, 60/60          |
| `npm run test:content`                      | PASS, 22/22          |
| `npm run test:unit`                         | PASS, 49/49          |
| `npm run test:component -- --run`           | PASS, 32/32          |
| `npm run test:integration`                  | PASS, 11/11          |
| `npm run test:e2e`                          | PASS, 8/8            |
| `npm run build`                             | PASS                 |
| `npm run test:bundle`                       | PASS                 |
| `npm run test:pwa`                          | PASS                 |
| `npm run test:pwa:offline`                  | PASS, both scenarios |
| `npm run format:check` / `git diff --check` | PASS                 |

## New findings

None.

## Remaining external verification

- real Supabase migration, RLS attack tests, and concurrent assignment execution;
- real Email OTP delivery/session lifecycle;
- deployed Edge Function, two-client convergence, reconnect upload, and conflict replay;
- Android/macOS installation and standalone launch;
- physical soft-keyboard/safe-area checks and a real screen reader;
- Cloudflare publication and real-origin production measurement.

Product and Learning Review recommends TEST-040 pass once the original Engineering Reviewer also closes its v2 review. External gaps must remain Not verified rather than being converted into local passes.
