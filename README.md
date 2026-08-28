# Article English

![Article English — Research and Medical English in context](public/og.png)

Article English is a local-first Research English + Medical English PWA. Its learning unit is a Context Card, not an isolated translation:

```text
Context Card = word + domain-specific sense + article/medical context
```

The MVP contains two isolated modules, stable daily New and Review queues, offline-first rating in IndexedDB, background Supabase synchronization, Email OTP authentication, a pinned FSRS adapter, and an installable Vite PWA.

## Current status

The repository is a release candidate. A private, local-data Preview is deployed at [wordeasy-preview.pages.dev](https://wordeasy-preview.pages.dev) behind owner-only Cloudflare Access. Local automated checks exercise the demo learning flow, cloud adapters, sync failure and conflict handling, PWA offline launch, cached offline learning, bundle budgets, and startup under delayed or failed Supabase requests. The following still require an external environment and are intentionally not reported as passed:

- real Supabase migration, RLS, RPC, Edge Function, OTP, and two-client checks;
- Android Chrome and macOS Chrome installation;
- real screen-reader and physical-device keyboard/safe-area checks;
- hosted-origin offline restart, live global Cloudflare Access logout, and raw authenticated-response header capture.

See `docs/RELEASE_VERIFICATION.md` for the exact evidence boundary.

## Product behavior

- Research English assigns exactly 5 General Research + 2 Statistics/Methodology + 3 Bioinformatics cards per study date.
- Medical English assigns 10 cards with deterministic rolling category balance.
- New and Review totals are separate and stable for the profile-local study date.
- A rating is committed locally before the UI advances. Sync failure never blocks learning.
- Immutable UUID review events are retried idempotently through an account-scoped outbox.
- The canonical 60-card authoring dataset contains 30 Research and 30 Medical cards and is not shipped in the initial browser bundle.
- Deferred features such as Add Word, search, AI, Anki, statistics dashboards, and social features have no placeholder routes or buttons.

## Technology

- React 19, TypeScript strict mode, React Router, Vite
- Dexie/IndexedDB for local learning state
- Supabase Auth + Postgres + RLS + RPCs
- Supabase Edge Function for trusted FSRS conflict replay
- `ts-fsrs` pinned behind a project adapter
- `vite-plugin-pwa` / Workbox `generateSW`
- Vitest, Testing Library, Playwright, and static release checks

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```bash
npm ci
npm run dev:demo
```

The demo is explicit and uses its own IndexedDB namespace. It derives a controlled 20-card browser subset from the canonical dataset at build time: Research 5 + 2 + 3 and Medical 10. The full 60-card dataset is never imported by browser source.

For cloud mode, copy `.env.example` to `.env.local` and set only the public browser values:

```dotenv
VITE_APP_MODE=cloud
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```bash
npm run dev:cloud
```

Production does not silently fall back to demo when configuration is absent.

## Deploy a local-data preview without Supabase

The explicit Preview build is for trying the installable PWA before a Supabase project exists:

> Current private deployment: [https://wordeasy-preview.pages.dev](https://wordeasy-preview.pages.dev). Access requires the configured owner identity; Preview progress remains only in that browser.

```bash
npm run build:preview
npm run test:preview-build
npm run test:pwa:preview
npm run test:secrets -- dist-preview
npm run test:preview:e2e
```

Upload `dist-preview` to a separate Cloudflare Pages project. Do not configure Supabase variables. Before publishing, protect both the permanent hostname and every atomic deployment alias with Cloudflare Access:

```text
wordeasy-preview.pages.dev
*.wordeasy-preview.pages.dev
```

Use a default-deny policy that requires both `Cloudflare Account Member` and the owner's exact email identity, with no `Everyone`, `Bypass`, or Service Auth rule. The current deployment uses a 30-minute application and policy session, Cloudflare IdP only, instant authentication, and no Cloudflare One Client authentication. Both applications enable `HttpOnly` and Binding Cookie with `SameSite=Lax` and stay hidden from the App Launcher. The Preview build emits a Cloudflare `_headers` file with strict same-origin CSP, noindex, HSTS, frame denial, no-referrer, nosniff, and a minimal Permissions Policy. Its Service Worker excludes `/cdn-cgi/` so Access login/logout routes cannot be replaced by the cached SPA. The cloud production build intentionally does not emit these Preview-only headers because it must connect to Supabase.

The deployed app always discloses that progress is saved only in the current browser, uses a separate IndexedDB namespace, provides no fake sync action, and does not silently replace the cloud production mode. Access protects network delivery; it cannot remotely revoke an App Shell or IndexedDB data already cached on an unlocked Mac user account.

Clearing site data, using private browsing, changing browsers, or changing devices loses Preview progress. The Preview contains the controlled 20-card subset and is not the complete cloud product.

## Configure Supabase

The repository contains ordered SQL migrations under `supabase/migrations/`. They create normalized public content, account-private learning state, constraints, indexes, RLS policies, stable assignment RPCs, immutable review-event ingestion, and trusted reconciliation RPCs. The content migration imports the validated 60-card seed.

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
<p>Your Article English code is: {{ .Token }}</p>
```

The browser calls `verifyOtp` with the email address, six-digit token, and email OTP type. Do not place a Supabase service-role credential in `.env.local`, Cloudflare Pages browser variables, source files, or the frontend build. The reconciliation Edge Function reads its privileged credential only from the server-side function environment.

After applying migrations and deploying the function, run the live acceptance scenarios in `docs/RELEASE_VERIFICATION.md`, especially cross-account RLS, immutable events, concurrent assignment, retry idempotency, and two-client consistency.

## Deploy the PWA to Cloudflare Pages

For the local-data Preview, use `npm run build:preview` and output directory `dist-preview` in a separate Pages project, with no environment variables. Complete the two-hostname Cloudflare Access gate above before the first publication, then verify anonymous denial for the root page, a direct route, `sw.js`, and the deployment-specific hostname.

For the complete cloud product:

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
supabase/migrations/ schema, RLS, RPC, and seed migrations
supabase/functions/  trusted review reconciliation Edge Function
tests/               unit, component, integration, browser, PWA, and performance checks
scripts/             content, PWA, bundle, secret, and performance gates
docs/                requirements, decisions, traceability, reviews, and release evidence
```

The detailed event/outbox/cursor/reconciliation contract is in `docs/SYNC_PROTOCOL.md`.
