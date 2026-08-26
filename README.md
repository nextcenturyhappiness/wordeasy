# Article English

![Article English — Research and Medical English in context](public/og.png)

Article English is a local-first Research English + Medical English PWA. Its learning unit is a Context Card, not an isolated translation:

```text
Context Card = word + domain-specific sense + article/medical context
```

The MVP contains two isolated modules, stable daily New and Review queues, offline-first rating in IndexedDB, background Supabase synchronization, Email OTP authentication, a pinned FSRS adapter, and an installable Vite PWA.

## Current status

The repository is a release candidate. Local automated checks exercise the demo learning flow, cloud adapters, sync failure and conflict handling, PWA offline launch, cached offline learning, bundle budgets, and startup under delayed or failed Supabase requests. The following still require an external environment and are intentionally not reported as passed:

- real Supabase migration, RLS, RPC, Edge Function, OTP, and two-client checks;
- Android Chrome and macOS Chrome installation;
- real screen-reader and physical-device keyboard/safe-area checks;
- Cloudflare Pages publication.

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

Requirements: Node.js 22 or newer and npm.

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
