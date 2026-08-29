# wordeasy

![wordeasy — Research and Medical English in context](public/og.png)

wordeasy is a local-first Research English + Medical English PWA. Its learning unit is a Context Card, not an isolated translation:

```text
Context Card = word + domain-specific sense + article/medical context
```

The MVP contains two isolated modules, stable daily New and Review queues, offline-first rating in IndexedDB, background Supabase synchronization, Email OTP authentication, a pinned FSRS adapter, and an installable Vite PWA.

## Current status

The repository is a release candidate with two formal personal distribution targets backed by the same React learning core:

- an installable Android/macOS Chrome PWA built with `standalone` mode;
- an Apple Silicon personal macOS `.app` / `.dmg` built with Tauri 2.

Both formal local targets use the complete 60-card catalog, keep progress on that device, and make no Supabase request. The older private, 20-card Preview remains deployment history rather than the current product delivery. Local automated checks exercise the formal PWA, desktop boundary, demo learning flow, cloud adapters, sync failure and conflict handling, PWA offline launch, cached offline learning, bundle budgets, and startup under delayed or failed Supabase requests. The following still require an external environment and are intentionally not reported as passed:

- real Supabase migration, RLS, RPC, Edge Function, OTP, and two-client checks;
- physical Android Chrome and macOS Chrome PWA installation;
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
- Tauri 2 / Rust for the personal macOS App and DMG
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

## Run the formal personal PWA

The formal local-data PWA is not the old Preview. It uses a stable `standalone:v1` IndexedDB identity and all 60 canonical cards:

```bash
npm run dev:standalone
npm run build:standalone
npm run test:standalone-build
npm run test:pwa:standalone
npm run test:standalone:e2e
```

Deploy `dist-standalone` to an HTTPS origin to install it from Android Chrome. Until Supabase is connected, Android and Mac keep separate progress and neither device is a backup for the other.

The protected Cloudflare project is at [https://wordeasy-preview.pages.dev](https://wordeasy-preview.pages.dev). Its legacy hostname still contains `preview`, but the current production deployment is the formal 60-card `wordeasy` standalone PWA (`d5aed166-71aa-434c-8785-e8bbca89039c`). Cloudflare Access requires the configured owner identity before any App Shell, route, manifest, Service Worker, or JavaScript asset is delivered. The current atomic deployment passed an authenticated Research + Medical rating/reload check. An already installed copy on the fixed hostname can continue to retain the previous name until its prompt update is accepted or all old client windows are closed and the new Service Worker takes control; do not clear site data merely to force the rename because that also removes local progress.

On Android, open that URL in Chrome, complete the Cloudflare Access login, then use Chrome's **Install app** or **Add to Home screen** command. Physical Android installation remains a manual acceptance step; the repository does not claim it has been run on a real phone.

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

The desktop build embeds the same frontend and the complete 60-card deferred catalog, but deliberately includes no Service Worker, Web Manifest, Cloudflare header file, Supabase configuration, Tauri IPC command, or plugin capability. Its stable identifier is `com.nextcenturyhappiness.wordeasy`.

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
<p>Your wordeasy code is: {{ .Token }}</p>
```

The browser calls `verifyOtp` with the email address, six-digit token, and email OTP type. Do not place a Supabase service-role credential in `.env.local`, Cloudflare Pages browser variables, source files, or the frontend build. The reconciliation Edge Function reads its privileged credential only from the server-side function environment.

After applying migrations and deploying the function, run the live acceptance scenarios in `docs/RELEASE_VERIFICATION.md`, especially cross-account RLS, immutable events, concurrent assignment, retry idempotency, and two-client consistency.

## Deploy the PWA to Cloudflare Pages

For the formal local-data PWA, use `npm run build:standalone` and output directory `dist-standalone`, with no environment variables. Complete the fixed-hostname and wildcard Cloudflare Access gate before publication, then verify anonymous denial for the root page, a direct route, `sw.js`, the manifest, a current JavaScript asset, and the deployment-specific hostname. The current protected deployment uses this target. Keep `dist-preview` for a distinct historical trial project only.

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
supabase/migrations/ schema, RLS, RPC, and seed migrations
supabase/functions/  trusted review reconciliation Edge Function
tests/               unit, component, integration, browser, PWA, and performance checks
scripts/             content, PWA, bundle, secret, and performance gates
src-tauri/           minimal Tauri 2 macOS wrapper, CSP, icons, and navigation guard
docs/                requirements, decisions, traceability, reviews, and release evidence
```

The detailed event/outbox/cursor/reconciliation contract is in `docs/SYNC_PROTOCOL.md`.
