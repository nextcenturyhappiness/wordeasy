# Sync Protocol

Updated: 2026-08-26

This document is the operational contract for local-first review synchronization. It supplements `02_DATA_SYNC_SECURITY.md`; it does not relax any requirement in that file.

## 1. Invariants

- The active Supabase session is the only source of account identity. Browser payload `user_id` is never authoritative.
- Every rating creates one immutable globally unique `event_id` and one guarded `presentation_action_id`.
- The local rating transaction commits the event, tentative FSRS state, progress materializations, and outbox row before the UI advances.
- Network work is never part of the rating transaction.
- Review events are audit facts and are never updated or deleted by ordinary users. Mutable application results live in `review_event_applications`.
- New and Review assignments are frozen per user, module, and profile-local `study_date`.
- Browser-provided FSRS before/after values are immutable evidence, not trusted canonical state.

## 2. Event identity and order

Each event carries:

```text
event_id
user/card/word-sense/module scope
presentation_action_id
queue_kind and study_date/timezone
rating and reviewed_at
device_id and strictly increasing device_sequence
base_revision
scheduler_before and scheduler_after evidence
scheduler_implementation_version
```

Cloud ingest fingerprints the complete normalized event. Retrying the same UUID and payload is idempotent. Reusing a UUID with a different fingerprint is rejected.

Deterministic replay order is:

```text
ordering_at → device_id → device_sequence → event_id
```

Normally `ordering_at = reviewed_at`. If the client timestamp is more than one day in the future or more than 365 days in the past relative to receipt, the event is marked with a clock anomaly and `ordering_at = received_at`. The event remains preserved; the server never silently rewrites its reported review time.

## 3. Assignment membership

Before accepting an event, cloud ingest verifies all of the following:

- the card is active and belongs to the declared module and word sense;
- `study_date` matches `reviewed_at` in the submitted valid IANA timezone;
- a New event belongs to that user's ready New assignment for the same module/date/card;
- a Review event belongs to that user's frozen Review assignment for the same module/date/card;
- the assignment timezone matches the event timezone.

A mismatch returns a per-event `rejected` outcome and never creates learned-word or canonical scheduler state. The hardening migration also excludes historical untrusted membership rows from future trusted replay.

Assignment creation, Review assignment creation, and event ingestion share a transaction advisory lock keyed by user and module. This prevents a race between freezing a queue and applying an event that changes eligibility.

The Review assignment RPC also refuses to create a first daily set while that user/module still has any `pending_reconciliation` event. This prevents a migration or delayed trusted replay from permanently freezing an empty or stale Review queue. An already-created set remains stable.

## 4. Outbox lifecycle

Outbox states are `pending`, `syncing`, and `failed`; successful acknowledgements are removed. IndexedDB v3 stores `cardId` on every outbox row and uses compound indexes for due claims, expired leases, module/status counts, and card/status conflict checks rather than joining or materializing historical rows.

1. A local rating inserts a `pending` row atomically with its event.
2. A sync run reads at most one batch limit from each active status, merges at most `3 × limit` candidates, claims at most 100 total rows, and marks them `syncing`.
3. At most 20 push batches are drained in one run, so a run is bounded while still handling more than one batch.
4. An accepted, duplicate, or conflict outcome acknowledges only that event and removes its outbox row.
5. A rejected or transport-failed event remains for inspection/retry with an incremented attempt count.
6. Retry delay is bounded exponential backoff, from seconds up to five minutes.
7. A `syncing` lease at least two minutes old is reclaimable after a crash; the exact cutoff is inclusive and indexed by `updatedAt`.
8. Partial batch success never clears failed siblings.

Pending counts are materialized per account and module so one module's sync state cannot alter the other's progress. The v2 → v3 migration backfills each outbox `cardId` from the matching immutable local event. A missing or mismatched event aborts and rolls back the version-change transaction instead of clearing or guessing data.

## 5. One sync run

All startup, online, focus, login, manual, and post-batch triggers converge on one account-scoped coordinator. Repeated calls in one runtime share the active promise. Across tabs, Web Locks use `wordeasy-sync:<user-id>`; the in-process fallback prevents duplicate loops where Web Locks are unavailable.

The account gateway performs cloud work in this order:

```text
1. push eligible local events
2. pull immutable events and state evidence by cursor
3. persist each pull page and any pending reconciliation card IDs atomically
4. reconcile affected cards through the trusted Edge Function
5. sync profile settings
6. ensure/fetch stable New and Review day caches for both modules
7. run a final bounded push/pull pass
8. refresh only affected local summaries and notify UI subscribers
```

The initial push/reconciliation occurs before a Review queue is frozen. This prevents an offline event from making a card due only after the day's cloud Review set has already been fixed.

## 6. Pull cursor and crash recovery

Cloud pull maintains two independent cursors:

```text
event cursor = (received_at, event_id)
state cursor = (state_epoch, change_sequence)
```

`event_id` is the stable tie-breaker when multiple events share a receipt timestamp. Every trusted canonical state commit receives a monotonically increasing `change_sequence`, so a device receives state changes even when its immutable event cursor is already at the end. Pages are bounded and both cursor components advance only after the page is merged locally.

`state_epoch` is a coordinated tombstone for a canonical-state reset. When the client epoch differs, the server ignores the submitted state sequence and starts that epoch from sequence zero. The local merge clears stale states that have no active outbox; it preserves tentative state for cards with pending/failed local events until those events are resolved. This removes rejected-only legacy state without discarding legitimate offline work.

`mergePullPage` writes the new compound cursor and the union of unresolved conflict card IDs in the same IndexedDB transaction. If a returned canonical state is skipped because that card still has active local outbox evidence, that card ID is added to the durable reconciliation set before the state cursor commits. Therefore a crash or later duplicate acknowledgement after cursor advancement cannot strand the tentative state. On restart, pending card IDs are processed even when there is no newer event page.

A pending card ID is removed only after the reconciled canonical state is committed locally and no active local outbox row for that card remains. If local evidence is still pending, the ID stays durable for a later run.

## 7. Trusted reconciliation

When concurrent events share or violate a base revision, all immutable events are retained and the card is marked for reconciliation.

The browser calls the `review-sync` Edge Function with its bearer session and a card ID. The function:

1. validates the bearer token and derives the user ID;
2. uses a server-only credential to fetch that user's trusted reconciliation bundle;
3. excludes rejected/untrusted applications;
4. sorts events deterministically;
5. replays them with pinned `ts-fsrs` version `5.4.1` inside the trusted function boundary;
6. calls a server-only compare-and-set commit RPC using expected revision and event-set hash;
7. retries once if the bundle became stale;
8. returns the committed canonical state to the authenticated browser.

The public/authenticated role cannot call the trusted bundle or commit RPCs directly. Legacy browser canonical-commit execution is revoked. The service-role credential exists only in the Edge Function environment and must never enter the frontend or Cloudflare Pages build.

The hardening migration, Edge Function, and matching browser runtime must be deployed as one coordinated release. A legacy browser cannot use the new pull signature or the revoked canonical commit path; it fails closed and retains its account-scoped IndexedDB/outbox until upgraded.

## 8. Merge and progress rules

- Remote immutable events are inserted idempotently into the account-scoped local database.
- A newer trusted canonical state replaces the local materialized state only for the same user/card scope.
- New completion counts distinct assigned cards rated at least once.
- Review completion counts distinct frozen Review cards rated at least once.
- Again/relearning does not increment either completed-card count twice.
- Learned words count distinct word senses first completed through a New assignment.
- Streak counts distinct study dates with at least one scored New or Review card.
- Research and Medical summaries, queues, state, and pending counts remain isolated.

## 9. Failure behavior

- No network, timeout, 5xx, or malformed response may roll back an already committed local rating.
- An incomplete or foreign push outcome set fails the run and retains the claims for retry.
- A pull page-limit breach fails visibly rather than looping without bound.
- Session expiry stops remote mutation, preserves the account-scoped outbox, and never exposes it to another account.
- An uncached offline device shows an explicit unavailable message and never invents an assignment.
- Scheduler implementation-version mismatch fails reconciliation visibly; it never silently mixes algorithms.

## 10. Verification boundary

Unit and integration tests cover local transaction atomicity, duplicate guards, batch/partial failure, exact claim/lease boundaries, bounded drain with 10,000 active outbox rows, v3 migration rollback, cursor persistence, skipped-state restart reconciliation, account/module scope, deterministic replay, and delayed/failed network startup. The production Edge FSRS module is executed directly in a golden parity test against the browser adapter. SQL structure tests cover grants, RLS declarations, membership checks, locks, and trusted RPC boundaries.

These checks do not substitute for a running Postgres/Supabase environment. Cross-account RLS denial, concurrent RPC execution, Edge Function deployment, real OTP, and two-client convergence remain Not verified until the live commands and scenarios in `RELEASE_VERIFICATION.md` are run.
