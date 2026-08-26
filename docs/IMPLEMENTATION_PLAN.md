# Implementation Plan

Updated: 2026-08-26 (Asia/Shanghai)

Current state: M0–M4 implementation and the local release-candidate gate are complete. All accepted v1 findings were remediated, both original reviewers completed v2 with `PASS WITH EXTERNAL GAPS`, and no local BLOCKER/HIGH/MEDIUM remains. Real Supabase/RLS/OTP/two-client execution, device installation/accessibility, and Cloudflare publication remain external verification work rather than local passes.

## 1. Goal and execution order

Build the complete Article English MVP in the repository-defined order:

```text
M0 baseline/planning
→ M1 local-first vertical slice
→ M2 cloud/auth/assignment/sync
→ M3 PWA/performance/accessibility
→ M4 content/QA/independent review/re-release gate
```

The product unit remains:

```text
Context Card = word + domain-specific sense + article/medical context
```

No Deferred feature will receive a route, placeholder, button, or production code.

## 2. Baseline

- Local path: `/Users/abcdefg/Documents/wordeasy`.
- Initial local state: requirements and review templates only; no application source, package manifest, lockfile, dependency tree, Git metadata, or executable project scripts.
- Remote: `https://github.com/nextcenturyhappiness/wordeasy.git`; `git ls-remote` succeeded with no refs, confirming an empty repository.
- Existing user files: requirements documents plus local `.obsidian/` and `.DS_Store`; these must be preserved locally and excluded from source control.
- Existing install/format/lint/typecheck/test/build baseline: **Not runnable**, because no package manifest or scripts existed. This is neither a pass nor an application failure.
- Local tool baseline: Node `v24.14.0`, npm `11.9.0`, Git `2.39.5`; no `gh`, Supabase CLI, or Docker-compatible local Supabase runtime detected.
- Initial analysis: Backend & Sync, Frontend & PWA, and Seed Content agents completed independent read-only requirement analysis. No production files were changed by those agents.

## 3. Architecture

### 3.1 Project structure

```text
src/
  application/       frozen UI/data contracts and use cases
  app/               bootstrap, providers, router, App Shell
  auth/              session and Supabase Email OTP adapters
  components/        Context Card, progress, feedback, forms
  data/              repository implementations and DTO mapping
  db/                Dexie database, migrations, scoped repositories
  domain/            cards, assignment, progress, events, settings
  pwa/               service-worker registration and safe update UI
  routes/            Home, Login, Today, Study, Settings
  scheduler/         pinned FSRS adapter
  styles/            tokens and global responsive styles
  sync/              outbox, push/pull, locks, reconciliation
data/                 authoring-only 60-card dataset and CSV template
scripts/              content, bundle, secret and build validation
supabase/
  migrations/         versioned SQL schema/RLS/RPC changes
  tests/              pgTAP database/RLS tests
tests/
  content/ data/ scheduler/ sync/ ui/ integration/ e2e/ performance/
public/               install assets only; never the complete vocabulary
docs/                 requirements, protocol, evidence, reviews
```

### 3.2 Routes and loading

| Route                              | Loading | Scope                                                       |
| ---------------------------------- | ------- | ----------------------------------------------------------- |
| `/`                                | eager   | Local-first Home, two module summaries, streak, sync state  |
| `/login`                           | lazy    | Email → six-digit OTP, resend, restore/expired/error states |
| `/today/:module`                   | lazy    | Separate New, Review, Total, shortage/offline states        |
| `/study/:module?queue=new\|review` | lazy    | Context-first prompt/reveal/rating flow                     |
| `/settings`                        | lazy    | Theme, IANA timezone, manual sync, sign out only            |
| `*`                                | lazy    | Minimal not-found page without fake navigation              |

Canonical domain module IDs are `research_english` and `medical_english`; route aliases are `research` and `medical` and are validated centrally.

### 3.3 Shared application contracts

Root owns and freezes `src/application/contracts.ts` before parallel implementation. UI consumes ports rather than Dexie, Supabase, or FSRS types:

- `AuthGateway`: request/verify/resend OTP, local restore, remote validation, auth listener, sign out.
- `LearningQueries`: cached Home, Today snapshot, and assigned Study queue.
- `LearningCommands`: one guarded local `rateCard` transaction.
- `AssignmentGateway`: ensure/pull stable New and Review assignments.
- `ReviewScheduler`: `preview` and `rate` using project-domain types.
- `SyncGateway`: push batch, pull cursor, reconciliation bundle, reconciliation commit.
- `SettingsGateway`: system/light/dark theme and IANA timezone.

Every production adapter binds `user_id` from the active session; UI inputs never provide an authoritative user ID.

### 3.4 Supabase/Postgres

Public authenticated-read tables:

```text
modules, categories, words, word_senses, contexts, cards
```

`contexts` includes `collocations text[]` and `context_genre`; stable content UUIDs and human-readable keys preserve normalized word/sense/context/card identity.

Private RLS tables:

```text
profiles
daily_assignment_sets
daily_assignments
daily_review_assignment_sets
daily_review_assignments
review_events
review_event_applications
review_states
learned_word_senses
study_days
user_settings
```

All schema changes are ordered SQL migrations. Private rows use `auth.uid()` isolation. Content is read-only to authenticated clients. Assignment/state writes use RPCs. Review events allow own-user insert/select only and never update/delete. `SECURITY DEFINER` functions obtain the user from `auth.uid()`, set an empty fixed `search_path`, fully qualify objects, and expose execution only to `authenticated`.

Core RPCs:

- `ensure_daily_assignment(module, requested_study_date)` validates the profile-timezone date, takes a transaction advisory lock, chooses deterministically, and inserts an all-or-nothing stable set.
- `ensure_daily_review_assignment(module, requested_study_date)` freezes the cards due before the next profile-local midnight, including an explicit empty set.
- `ingest_review_events(events)` is idempotent by global event UUID, records application/conflict metadata separately, and performs revision compare-and-set.
- Browser ingest preserves scheduler snapshots as evidence but never materializes them as trusted canonical state.
- `review-sync` obtains a server-only reconciliation bundle, replays pinned `ts-fsrs`, and calls a server-only event-set-hash + revision compare-and-set RPC.

### 3.5 IndexedDB

Dexie uses an explicit versioned schema with account-scoped compound keys for:

```text
cached_cards
cached_daily_assignments
cached_daily_review_assignments
local_review_events
local_review_states
sync_outbox
sync_metadata
daily_summary
local_profile
local_settings
learned_word_senses
study_days
```

Migrations preserve data and surface errors; no unconditional clear/delete is permitted. Home reads `daily_summary` only.

One rating transaction performs, atomically:

1. reject a repeated presentation action;
2. create a UUID immutable event;
3. update the tentative FSRS state;
4. mark the distinct assignment card complete;
5. update learned-sense/study-day/daily summary materializations;
6. add the event to the outbox.

The UI advances only after this local transaction commits; remote sync is never in the critical path.

### 3.6 Assignment and progress

- `study_date` is derived from the saved IANA profile timezone.
- Research is exactly `5 general_research + 2 statistics_methodology + 3 bioinformatics`.
- Medical is exactly 10 with deterministic rolling category balance.
- A quota shortage returns a stable structured all-or-nothing shortage result; it never substitutes a category or repeats a prior new card.
- New and Review assignment sets are stable across refresh, relogin, restart, and devices.
- Review total is a frozen set of distinct cards; Again/relearning never increments completed-card counts twice.
- `words learned` counts distinct word senses first completed as New; streak counts distinct profile-local study days with any scored card.

### 3.7 Scheduler and sync

- Use a precisely pinned maintained `ts-fsrs` release behind the project adapter.
- Persist scheduler implementation/config version in state and event snapshots; upgrades require an explicit migration and do not silently rewrite history.
- Outbox states: pending, syncing, failed, with acknowledged rows removed. Partial success acknowledges only successful event IDs; bounded exponential backoff retains failures.
- Sync triggers: login, startup, online, focus, manual request, and completed batch.
- Use Web Locks where available with an account-scoped in-process fallback; outbox claims also use reclaimable IndexedDB leases.
- Flow: push pending → pull immutable events by `(received_at,event_id)` and canonical states by `(state_epoch,change_sequence)` → atomically persist both cursors plus pending-conflict work → trusted reconcile → ensure/fetch assignments → final bounded sync → refresh affected summaries.
- Conflicts retain every event. Reconcile only the affected card by stable order `ordering_at → device_id → device_sequence → event_id`, replay inside the trusted Edge Function with the same pinned FSRS implementation, then CAS-commit canonical state.
- `docs/SYNC_PROTOCOL.md` documents cursor, crash recovery, clock anomaly, membership, retry, collision, and trusted reconciliation rules.

### 3.8 Authentication and demo mode

- Production implements Supabase Email OTP, restore/listener/expiry/sign-out, and never logs OTP or tokens.
- `dev:demo` is an explicit development-only mode with a separate database namespace.
- Production never silently falls back to demo when Supabase configuration is absent; it shows a configuration/login error while cached account data remains isolated and unsent outbox is retained.
- Only the public Supabase URL and anon/publishable key may enter the frontend.

### 3.9 PWA, startup, and performance

- `vite-plugin-pwa` with `generateSW` and prompt-based updates.
- Precache only App Shell assets, manifest, icons, and hashed route chunks; never cache Supabase Auth/private API responses or the vocabulary dataset.
- Inline pre-React theme application avoids a dark-mode white flash.
- Render App Shell immediately, then open IndexedDB/read local session/settings/Home in parallel. Remote auth and sync start only after cached Home can render.
- Eager code is limited to App Shell, router core, IndexedDB bootstrap, local session, and Home. Study, FSRS, Supabase, sync, Settings, and other routes are lazy.
- Implement marks: `app-shell-visible`, `cached-home-ready`, `first-study-card-ready`, `remote-sync-complete`.
- Enforce initial JS/Home JS/CSS/precache budgets and a 10,000-event summary-only benchmark.
- System fonts and local icons only; no UI framework, chart package, remote font, or vocabulary import in `src/`/`public/`.

## 4. File ownership

| Agent            | Writable paths                                                                                                                                                                                | Must not modify                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Backend & Sync   | `src/domain/**`, `src/auth/**`, `src/data/**`, `src/db/**`, `src/scheduler/**`, `src/sync/**`, `supabase/**`, `tests/data/**`, `tests/scheduler/**`, `tests/sync/**`, `docs/SYNC_PROTOCOL.md` | package/lock/config, frontend, content, shared docs                    |
| Frontend & PWA   | `src/app/**`, `src/routes/**`, `src/components/**`, `src/styles/**`, `src/pwa/**`, `public/icons/**`, `tests/ui/**`                                                                           | backend/data internals, content, package/lock/config, shared docs      |
| Seed Content     | `data/**`, `scripts/lib/content-*`, `scripts/validate-content.*`, `tests/content/**`                                                                                                          | auth, sync, UI, package/lock/config, shared docs                       |
| QA & Integration | `tests/integration/**`, `tests/e2e/**`, `tests/performance/**`, small integration fixes explicitly assigned by Root                                                                           | requirements, accepted architecture, deleting/weakening/skipping tests |
| Root             | shared contracts, package/lock/config, `index.html`, deployment, generated seed integration, README, all shared docs                                                                          | user-local `.obsidian/` and unrelated files                            |

Writing agents use separate Git worktrees after the M0 checkpoint. Root integrates and resolves shared-file requests serially.

## 5. Milestones and verification

### M1 — Local vertical slice

- Scope: explicit demo session → cached Home → Research Today → Context Card → Reveal → Good → atomic IndexedDB persistence → refresh retains progress.
- Requirements: CORE-001–007, CORE-008 partial, CORE-009 partial, CORE-005 module model; UI-001–003, UI-006–010; LOCAL-001/003/004; SYNC-001/002/004 partial; DATA-004; TEST-002/005–008/015.
- Tests: domain progress, scheduler adapter smoke, Dexie transaction/upgrade, component prompt/reveal, duplicate-rating integration, refresh persistence.
- Exit: format, lint, typecheck, unit, component/integration, production build pass; relevant Traceability rows updated; Git checkpoint.

### M2 — Cloud, assignment, and sync

- Scope: OTP/session, migrations/RLS/RPCs, both module quotas, stable New/Review sets, FSRS, outbox push/pull, idempotency, account isolation, deterministic reconciliation.
- Requirements: AUTH-_, DATA-_, ASSIGN-_, SCHED-_, LOCAL-_, SYNC-_, SEC-* plus completed CORE progress semantics.
- Tests: TEST-003–024 and regression from M1. pgTAP/local Supabase tests run only if a compatible runtime is available; otherwise SQL artifacts remain implemented but environment-dependent tests are Not verified.
- Exit: all automated non-environmental tests and build pass; secrets scan passes; real Supabase/two-client verification reported truthfully; Git checkpoint.

### M3 — PWA and performance

- Scope: manifest/icons/SW/update, offline shell and cached cards, responsive Android/macOS UI, keyboard and A11Y, theme, route splitting, startup marks, bundle/performance checks.
- Requirements: UI-011–014, PWA-_, PERF-_, A11Y-001.
- Tests: TEST-025–033 plus all prior regression.
- Exit: generated assets and offline production shell verified automatically; browser/device measurements recorded; real installation remains Not verified until actually performed; Git checkpoint.

### M4 — Content, QA, review, and release

- Scope: normalized 60-card dataset, CSV template, validator/import, complete QA, two independent read-only reviewers v1, resolution/fixes, complete regression, original reviewers v2, README/deployment docs.
- Requirements: CONTENT-001–011, RES-002, MED-002/003, CORE-010, SCOPE-001; CONTENT-012/SCOPE-002 remain Deferred.
- Tests: TEST-001 and TEST-034–040 plus the entire previous suite and production build.
- Exit: no unresolved BLOCKER or unexplained HIGH; every P0 has implementation plus automated/manual evidence; Reviewer v2 complete; deployment attempted only after the release gate.

Local exit result: achieved on 2026-08-26. Production deployment was not attempted because no Supabase/Cloudflare account credentials or live project identifiers were available in this workspace; the exact external steps and gaps are recorded in `README.md` and `RELEASE_VERIFICATION.md`.

### Required command families

Final package scripts will expose:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:component
npm run test:integration
npm run test:content
npm run test:e2e
npm run test:db
npm run build
npm run test:pwa
npm run test:bundle
npm run test:perf
npm run test:secrets
```

Every milestone records exact commands, outcomes, and environment-dependent omissions. Missing real credentials/devices are never converted into a pass.

## 6. Content contract

- Authoring source: `data/seed-data.json`, schema versioned, exactly 30 Research and 30 Medical cards.
- Research distribution: 15 General, 6 Statistics/Methodology, 9 Bioinformatics.
- Medical distribution: all 13 required categories, with 9 categories ×2 and 4 categories ×3.
- Every seed uses `source_type = original_example` and null source title/URL/DOI/PMID unless independently verified later.
- Stable UUIDv5 entity IDs derive from immutable content keys. Changing sense/context creates a new ID; copy edits retain it.
- JSON and CSV normalize to the same contract and validator.
- Seed data is imported by controlled tooling and never imported into browser source or placed in `public/`.

## 7. Known risks and external verification

- Sixty cards provide exactly three full new-card days; day four must produce an honest shortage message.
- Real Email OTP, RLS runtime behavior, concurrent RPCs, and cross-device TEST-020 require a configured Supabase project or local Supabase-compatible runtime.
- Android Chrome and macOS Chrome installation require real-device/manual checks.
- Cloudflare Pages publication requires account/project access and final environment variables.
- Absolute timing budgets vary by hardware; bundle budgets and non-blocking architecture remain mandatory, while timing reports must include the actual test environment and medians.
- Canonical FSRS conflict state requires trusted Edge Function replay. Browser state remains local-first tentative state and immutable audit evidence only; the service-role credential is never exposed to the frontend.
- Migration `20260826000600_sync_hardening.sql`, `review-sync`, and the matching frontend require a coordinated deployment. Legacy clients fail closed on the changed cursor/revoked commit contract and preserve their local outbox until upgraded.
