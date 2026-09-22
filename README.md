# wordeasy

![wordeasy — Research and Medical English in context](public/og.png)

wordeasy is a local-first Research English + Medical English + 必备医学英语 PWA. Its learning unit is a Context Card, not an isolated translation:

```text
Context Card = word + domain-specific sense + article/medical context
```

The product has three isolated modules (`research_english`, `medical_english`, `essential_medical`), stable daily New and Review queues, offline-first rating in IndexedDB, a pinned FSRS adapter, and an installable Vite PWA. The owner's Mac app and phone PWA each keep progress only on that device (DEC-059). The hosted cloud PWA can still use Email OTP and Supabase sync, but it is an optional legacy target.

## Agent handoff

Do not rely on chat memory. Before any product or quota change, read in this order:

1. `AGENTS.md` — permanent engineering rules
2. `docs/00_REQUIREMENTS_INDEX.md` — current requirement files and reading matrix
3. the task-relevant docs from that matrix (usually `docs/01_PRODUCT_CORE.md` plus the domain file)
4. the latest accepted entries in `docs/DECISIONS.md` and `docs/TRACEABILITY.md`

`docs/` is the source of truth. If this README or `AGENTS.md` disagrees with those files, follow the docs, record the conflict in `docs/DECISIONS.md`, and update `docs/TRACEABILITY.md`. Do not silently reinterpret.

Make the smallest correct diff. Do not reintroduce Deferred features from SCOPE-002: Add Word, a global Search page or Search nav, AI generation, Anki / `.apkg`, statistics dashboards, social features, OCR, article/PDF import, CSV export, native Android packaging, or store / notarized distribution. Home local Context Card search is authorized (DEC-032 / DEC-039 / DEC-042); a separate search product is not. Do not reintroduce Supabase Sync as a requirement between the Mac app and the phone (DEC-059).

## Current status

The repository is a release candidate with three formal personal distribution targets that share the same React learning core:

- an installable Android / macOS Chrome local-data PWA in `standalone` mode (the phone product path);
- an Apple Silicon personal macOS `.app` / `.dmg` built with Tauri 2, which uses the same local personal catalog and does not sync with the phone (DEC-059);
- the hosted cloud PWA at [https://wordeasy-cloud.pages.dev](https://wordeasy-cloud.pages.dev) (`npm run build` / `npm run dev:cloud`), kept as an optional legacy target.

The standalone PWA and the personal macOS App each keep the complete personal catalog on that device (900 cards: Research 60 + Medical 177 + 必备医学英语 663) and make no Supabase request. Their IndexedDB identities stay separate: `wordeasy:standalone:v1:local-user` on the phone and `wordeasy:desktop:v1:local-user` on the Mac. Switching a Mac from the old cloud account to this local app starts a new local history; existing `article-english:cloud:*` data is left in place. The older private, 20-card Preview remains deployment history rather than the current product delivery. Local automated checks exercise the formal PWA, desktop local boundary (including DEC-055 fuzzy search and the deferred 900-card catalog), demo learning flow, cloud adapters, sync failure and conflict handling, PWA offline launch, cached offline learning, bundle budgets, and startup under delayed or failed Supabase requests. The following still require an external environment and are intentionally not reported as passed:

- real Supabase migration, RLS, RPC, Edge Function, OTP, and two-client checks;
- physical Android Chrome and macOS Chrome PWA installation;
- real screen-reader and physical-device keyboard/safe-area checks;
- hosted-origin offline restart, live global Cloudflare Access logout, and raw authenticated-response header capture.

See `docs/RELEASE_VERIFICATION.md` for the exact evidence boundary.

## Product behavior

- Three modules: Research English (`research_english`), Medical English (`medical_english`), and 必备医学英语 (`essential_medical`, ~663 cards). They keep separate assignments, progress, review state, and caches (CORE-005 / CORE-011 / DEC-047).
- Research English assigns exactly 5 General Research + 2 Statistics/Methodology + 3 Bioinformatics cards per study date.
- Medical English assigns 7 词根构词 (`morphology`) + 3 病历用语 (chart / class vocabulary). That 7+3 split is the quota; it is not a rolling 10-card category balance (DEC-044).
- 必备医学英语 assigns 10 new cards per day from a single `core` pool (DEC-047).
- New and Review totals are separate and stable for the profile-local study date.
- A rating is committed locally before the UI advances. Sync failure never blocks learning.
- Immutable UUID review events are retried idempotently through an account-scoped outbox.
- Study shows the lemma and the full context sentence on the front (no cloze). Reveal answers with meaning-in-context, not a missing-word prompt (DEC-046). 必备医学英语 examples are real clinical / physiological / chart contexts, not classroom frames or mad-lib shells (DEC-053 / DEC-054). Root/affix classroom notes go in `usage_note` when they help; otherwise that field may be empty (DEC-052).
- Canonical catalog sizes: Research 60; Medical 177 (140 active, 37 deactivated specialty / shallow-chart cards); 必备医学英语 663. Standalone / personal full catalog is 900. Demo is an explicit 20-card Research + Medical subset; 必备医学英语 is shortage in Demo.
- The full catalog is not shipped in the initial browser JavaScript bundle. Hosted cloud / PWA / demo search the local day-cache (and other already-cached cards) with case-insensitive substring matching (DEC-032 / DEC-039 / DEC-042). Mac desktop (`VITE_APP_MODE=desktop`) and standalone seed the full local catalog into their own IndexedDB for Home search (DEC-059) and allow bounded lemma / display-form fuzzy matching (DEC-055). Hosted cloud / PWA search stays substring + day-cache unless a later decision documents otherwise.
- Deferred features such as Add Word, a global Search page, AI, Anki, statistics dashboards, and social features have no placeholder routes or buttons. Home local search is not one of those Deferred items.

## Technology

- React 19, TypeScript strict mode, React Router, Vite
- Dexie/IndexedDB for local learning state
- Supabase Auth + Postgres + RLS + RPCs
- Supabase Edge Function for trusted FSRS conflict replay
- `ts-fsrs` pinned behind a project adapter
- `vite-plugin-pwa` / Workbox `generateSW`
- Tauri 2 / Rust for the personal macOS App and DMG
- Vitest, Testing Library, Playwright, and static release checks

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```bash
npm ci
npm run dev:demo
```

The demo is explicit and uses its own IndexedDB namespace. It derives a controlled 20-card browser subset from the canonical dataset at build time: Research 5 + 2 + 3 and Medical 7 词根构词 + 3 病历用语. 必备医学英语 is not in that subset (Demo reports shortage / `newTotal` 0). The full catalog is never imported by demo or hosted-cloud browser source.

For the optional hosted cloud PWA, copy `.env.example` to `.env.local` and set only the public browser values:

```dotenv
VITE_APP_MODE=cloud
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```bash
npm run dev:cloud
```

The desktop Vite mode does not read Supabase settings. Do not put those values in the committed `.env.desktop` file. Production cloud packaging does not silently fall back to demo when configuration is absent. Desktop packaging does not fall back to the cloud runtime.

## Run the formal personal PWA

The formal local-data PWA is not the old Preview. It uses a stable `standalone:v1` IndexedDB identity and the complete 900-card personal catalog (Research 60 + Medical 177 + 必备医学英语 663):

```bash
npm run dev:standalone
npm run build:standalone
npm run test:standalone-build
npm run test:pwa:standalone
npm run test:standalone:e2e
```

Deploy `dist-standalone` to an HTTPS origin to install it from Android Chrome. The phone PWA is local-only. It is not synced with the Mac app, and neither device is a backup for the other. After this local-Mac change, redeploy `dist-standalone` to the Access-protected Pages project when publishing the phone build; this repository change does not publish that site.

The protected local-data Cloudflare project is at [https://wordeasy-preview.pages.dev](https://wordeasy-preview.pages.dev). Its legacy hostname still contains `preview`, but the current production deployment on that project is the formal `wordeasy` standalone PWA, not the 20-card trial. Cloudflare Access requires the configured owner identity before any App Shell, route, manifest, Service Worker, or JavaScript asset is delivered. The documented atomic deployment `d5aed166-71aa-434c-8785-e8bbca89039c` passed an authenticated Research + Medical rating/reload check; later catalog growth to 900 cards is in the repository contract, not a claim that every live asset was re-captured in this README. An already installed copy on the fixed hostname can continue to retain the previous name until its prompt update is accepted or all old client windows are closed and the new Service Worker takes control; do not clear site data merely to force the rename because that also removes local progress.

On Android, open that URL in Chrome, complete the Cloudflare Access login, then use Chrome's **Install app** or **Add to Home screen** command. Physical Android installation remains a manual acceptance step; the repository does not claim it has been run on a real phone.

The hosted **cloud** PWA is a different, optional origin: [https://wordeasy-cloud.pages.dev](https://wordeasy-cloud.pages.dev). Email OTP belongs there only. Do not treat the Access-gated standalone hostname as the cloud product, and do not treat the Mac app as a client of that cloud account.

## Build the personal macOS App

Requirements: Apple Silicon Mac, Xcode Command Line Tools, and the stable Rust toolchain.

```bash
npm ci
rustup component add rustfmt clippy
npm run desktop:rust:check
npm run desktop:build
```

The generated files are:

```text
src-tauri/target/aarch64-apple-darwin/release/bundle/macos/wordeasy.app
src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/wordeasy_0.1.0_aarch64.dmg
```

The desktop build embeds the same frontend and the local personal learning runtime (DEC-059): no Email OTP, no Sync status, and no Supabase request. Ratings stay in IndexedDB `wordeasy:desktop:v1:local-user`. It includes no Service Worker, Web Manifest, Cloudflare header file, Tauri IPC command, or plugin capability. CSP and navigation allow only the local WebView origin. Its stable identifier is `com.nextcenturyhappiness.wordeasy`. Home search loads the deferred 900-card catalog into that local database and allows bounded fuzzy matching (DEC-055).

On Apple Silicon, `npm run desktop:build` does not need Supabase env. Do not hardcode a publishable key in git, and never configure `SUPABASE_SERVICE_ROLE_KEY` for the client. Rebuild the `.app` after this change; an already installed cloud-era app keeps the old runtime until it is replaced. The new local database does not import or delete the previous cloud account.

This is an ad-hoc-signed personal build, not a Developer ID signed/notarized public release. It is intended for the Mac that built it. Third-party distribution without Gatekeeper warnings requires a paid Apple Developer identity and notarization. IndexedDB is not encrypted by the app; macOS login security and FileVault protect data at rest.

## Historical local-data Preview without Supabase

The explicit Preview build remains available for regression testing and for creating a separate limited trial. It is no longer the product deployed at `wordeasy-preview.pages.dev`; that legacy project now serves the formal standalone target above. The previous 20-card deployment is retained only in Cloudflare deployment history.

```bash
npm run build:preview
npm run test:preview-build
npm run test:pwa:preview
npm run test:secrets -- dist-preview
npm run test:preview:e2e
```

If this historical Preview is published again, upload `dist-preview` to a separate Cloudflare Pages project and do not configure Supabase variables. Before publishing, protect both the permanent hostname and every atomic deployment alias with Cloudflare Access:

```text
preview-only-project.pages.dev
*.preview-only-project.pages.dev
```

Use a default-deny policy that requires both `Cloudflare Account Member` and the owner's exact email identity, with no `Everyone`, `Bypass`, or Service Auth rule. The protected formal standalone deployment uses a 30-minute application and policy session, Cloudflare IdP only, instant authentication, and no Cloudflare One Client authentication. Both Access applications enable `HttpOnly` and Binding Cookie with `SameSite=Lax` and stay hidden from the App Launcher. Local-only Preview and standalone builds emit a Cloudflare `_headers` file with strict same-origin CSP, noindex, HSTS, frame denial, no-referrer, nosniff, and a minimal Permissions Policy. Their Service Workers exclude `/cdn-cgi/` so Access login/logout routes cannot be replaced by the cached SPA. The cloud production build intentionally does not emit these local-only headers because it must connect to Supabase.

Any published Preview always discloses that progress is saved only in the current browser, uses a separate IndexedDB namespace, provides no fake sync action, and does not silently replace the cloud production mode. Access protects network delivery; it cannot remotely revoke an App Shell or IndexedDB data already cached on an unlocked Mac user account.

Clearing site data, using private browsing, changing browsers, or changing devices loses Preview progress. The Preview contains the controlled 20-card subset and is not the complete cloud product.

## Configure Supabase

The repository contains ordered SQL migrations under `supabase/migrations/`. They create normalized public content, account-private learning state, constraints, indexes, RLS policies, stable assignment RPCs, immutable review-event ingestion, and trusted reconciliation RPCs. The content migrations import the validated seed in additive batches so the original 60 Research / Medical rows stay unchanged; later migrations add the second batch, deactivate hard Medical cards, insert morphology / chart replacements, and add the independent 必备医学英语 catalog (DEC-047–054). SQL in this repository is not the same as a remote apply.

With the Supabase CLI authenticated and linked to the intended project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy review-sync
supabase db push
```

Treat the sync-hardening release as a coordinated deployment. Deploy the Edge Function first, apply the migrations, and then publish the matching frontend without an extended gap. Migration `20260826000600_sync_hardening.sql` changes the pull cursor contract and revokes the legacy browser canonical-state RPC. An older frontend therefore fails closed at sync rather than writing an untrusted state; its IndexedDB data and outbox remain available for the upgraded frontend.

Configure Auth to send a six-digit Email OTP. The email template must expose the token, for example:

```html
<p>Your wordeasy code is: {{ .Token }}</p>
```

The browser calls `verifyOtp` with the email address, six-digit token, and email OTP type. Do not place a Supabase service-role credential in `.env.local`, Cloudflare Pages browser variables, source files, or the frontend build. The reconciliation Edge Function reads its privileged credential only from the server-side function environment.

After applying migrations and deploying the function, run the live acceptance scenarios in `docs/RELEASE_VERIFICATION.md`, especially cross-account RLS, immutable events, concurrent assignment, retry idempotency, and two-client consistency.

## Deploy the PWA to Cloudflare Pages

For the formal local-data PWA, use `npm run build:standalone` and output directory `dist-standalone`, with no environment variables. Complete the fixed-hostname and wildcard Cloudflare Access gate before publication, then verify anonymous denial for the root page, a direct route, `sw.js`, the manifest, a current JavaScript asset, and the deployment-specific hostname. The current protected standalone deployment uses this target on `wordeasy-preview.pages.dev`. Keep `dist-preview` for a distinct historical trial project only.

For the optional legacy cloud PWA at [https://wordeasy-cloud.pages.dev](https://wordeasy-cloud.pages.dev):

1. Push this repository to GitHub.
2. In Cloudflare Pages, import `nextcenturyhappiness/wordeasy` through Git integration.
3. Use build command `npm run build` and output directory `dist`.
4. Add `VITE_APP_MODE=cloud`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables.
5. Coordinate this frontend publication with the Supabase function/migration sequence above.
6. Add the Pages origin to the allowed Supabase Auth URLs and run the real install/OTP acceptance checks.

Git-integrated Pages projects rebuild on subsequent pushes. Never configure `SUPABASE_SERVICE_ROLE_KEY` as a Pages variable.

## Verification commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:unit
npm run test:component
npm run test:integration
npm run test:content
npm run content:validate
npm run content:seed-sql:check
npm run build
npm run test:bundle
npm run test:pwa
npm run build:preview
npm run test:preview-build
npm run test:pwa:preview
npm run test:preview:e2e
npm run build:standalone
npm run test:standalone-build
npm run test:pwa:standalone
npm run test:standalone:e2e
npm run build:desktop:web
npm run test:desktop-build
npm run desktop:rust:check
npm run desktop:build
npm run test:pwa:offline
npm run test:perf
npm run test:perf:e2e
npm run test:secrets
npm run test:e2e
```

`npm run test:db` requires the Supabase CLI and its local database runtime. A missing CLI/runtime is an unverified external gate, not a passing test.

## Repository map

```text
src/                 React app, domain, IndexedDB, auth, sync, and PWA code
data/                canonical authoring-only seed data and CSV template
data/essential-medical/  必备医学英语 lemmas, source text, and generated cards
supabase/migrations/ schema, RLS, RPC, and seed migrations
supabase/functions/  trusted review reconciliation Edge Function
tests/               unit, component, integration, browser, PWA, and performance checks
scripts/             content, PWA, bundle, secret, and performance gates
src-tauri/           minimal Tauri 2 macOS wrapper, CSP, icons, and navigation guard
docs/                requirements, decisions, traceability, reviews, and release evidence
```

The detailed event/outbox/cursor/reconciliation contract is in `docs/SYNC_PROTOCOL.md`.
