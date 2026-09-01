# Release Verification

Updated: 2026-08-29 (Asia/Shanghai)

## 1. Evidence boundary

This ledger distinguishes local implementation evidence from external-environment evidence. A mocked transport, SQL text assertion, browser emulation, or generated PWA asset is not reported as a live Supabase, real-device installation, or screen-reader pass.

Environment used for the final local gate:

```text
macOS 15.7 (Darwin 24.6.0, arm64)
Node.js v24.14.0
npm 11.9.0
Google Chrome 151.0.7922.175
Final local build gate: 2026-08-29
Hosted Access recheck: 2026-08-29
```

## 2. Final command ledger

| Command                              | Final result | Evidence                                                                                               |
| ------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------ |
| `npm ci --prefer-offline --no-audit` | PASS         | Clean lockfile install, 539 packages                                                                   |
| `npm run format:check`               | PASS         | All matched files use Prettier style                                                                   |
| `npm run lint`                       | PASS         | ESLint, zero warnings allowed                                                                          |
| `npm run typecheck`                  | PASS         | App project references and Edge Function strict TypeScript                                             |
| `npm run test:unit`                  | PASS         | 16 files / 79 tests                                                                                    |
| `npm run test:component`             | PASS         | 8 files / 36 tests                                                                                     |
| `npm run test:integration`           | PASS         | 4 files / 11 tests                                                                                     |
| `npm run test:content`               | PASS         | 1 file / 22 tests                                                                                      |
| `npm run test:perf`                  | PASS         | 10,000 active-outbox bounded-selection benchmark                                                       |
| `npm test`                           | PASS         | 33 files / 170 tests                                                                                   |
| `npm run content:validate`           | PASS         | 60 cards: 30 Research, 30 Medical; exact distributions and source audit                                |
| `npm run content:seed-sql:check`     | PASS         | Generated seed migration matches canonical JSON                                                        |
| `npm run build`                      | PASS         | 126 modules; PWA `generateSW`; 24-entry production precache                                            |
| `npm run test:bundle`                | PASS         | All gzip and precache budgets below limits                                                             |
| `npm run test:pwa`                   | PASS         | Manifest, icons, SW generation, and registration                                                       |
| `npm run test:secrets`               | PASS         | Tracked files, frontend production files, and untracked server-source function files scanned           |
| `npm run test:e2e`                   | PASS         | 8/8 across macOS and Android Chrome projects                                                           |
| `npm run test:pwa:offline`           | PASS         | Production offline App Shell 1/1; cached offline learning/reload/outbox 1/1; production build restored |
| `npm run test:perf:e2e`              | PASS         | Production cloud delay/failure 2/2; synthetic three-run metrics 1/1; production build restored         |
| `git diff --check`                   | PASS         | No whitespace errors                                                                                   |
| `npm run test:db`                    | NOT VERIFIED | Exit 127: `supabase: command not found`; no Supabase CLI/Postgres/Docker runtime                       |

Preview deployment gate added on 2026-08-27:

| Command                                | Result | Evidence                                                                                      |
| -------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `npm run build:preview`                | PASS   | Explicit preview mode; 140 modules; 23-entry Workbox precache                                 |
| `npm run test:preview-build`           | PASS   | 77.90/125.01/3.33/165.97 KiB; enforced Home budget; mismatched modes fail closed              |
| `npm run test:pwa:preview`             | PASS   | Standalone Preview manifest, exact icon dimensions, static-only SW, registration              |
| `npm run test:secrets -- dist-preview` | PASS   | Preview output included in the tracked/source/production secret scan                          |
| `npm run test:preview:e2e`             | PASS   | Actual Preview entry: local-only notice/status, rating, reload, direct route, offline restart |

The rebuilt Preview additionally emits a Preview-only Cloudflare `_headers` file. Static verification covers strict same-origin CSP, HSTS, noindex, frame denial, no-referrer, nosniff, COOP/CORP, and disabled camera/microphone/geolocation/payment/USB capabilities. Cloudflare parsed this file for the successful deployment; live Access evidence is recorded in section 8. A raw authenticated-response header capture remains explicitly open.

Formal personal-target gate added on 2026-08-28:

| Command                             | Result | Evidence                                                                                               |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `npm run build:standalone`          | PASS   | Formal 60-card local-data PWA; standalone manifest and Service Worker                                  |
| `npm run test:standalone-build`     | PASS   | 77.90/115.04/3.33/180.96 KiB; dedicated deferred 60-card and FSRS chunks; all PERF-011 limits enforced |
| `npm run test:pwa:standalone`       | PASS   | Formal manifest, exact icons, static-only precache, registration, `/cdn-cgi/` navigation exclusion     |
| `npm run test:standalone:e2e`       | PASS   | Android-sized flow: 60-card target, rating/reload/direct-route/offline restart, no Supabase request    |
| `npm run build:desktop:web`         | PASS   | Formal desktop web target; no manifest, Service Worker, Cloudflare headers, or Supabase runtime        |
| `npm run test:desktop-build`        | PASS   | 77.75/114.90/3.33 KiB; dedicated deferred 60-card and FSRS chunks; strict desktop boundary assertions  |
| `npm run desktop:rust:check`        | PASS   | Rust format, Clippy with warnings denied, and 2 navigation-guard tests                                 |
| `npm run desktop:build`             | PASS   | Tauri 2 Apple Silicon `.app` and `.dmg` rebuilt with ad-hoc signature and hardened runtime             |
| `codesign --verify --deep --strict` | PASS   | App valid on disk and satisfies its designated requirement                                             |
| `hdiutil verify`                    | PASS   | Final DMG checksum valid                                                                               |

Final personal DMG evidence:

```text
Artifact: src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/wordeasy_0.1.0_aarch64.dmg
Size: 1,281,990 bytes
SHA-256: e2230fef8039658f640a7f5923e0ab35a2a4ac0b964a3ed0d749e2ed9a90c02d
Architecture: arm64
Bundle identifier: com.nextcenturyhappiness.wordeasy
Signature: ad-hoc, hardened runtime; no TeamIdentifier
```

The rebuilt DMG was mounted read-only, contained `wordeasy.app` plus the Applications symlink, and the mounted app passed arm64, signature, executable-name, bundle-name, and identifier checks. `spctl --assess` rejected the artifact as expected because it is ad-hoc signed and not Apple Developer ID notarized; this is not presented as a trusted third-party distribution pass. After the required action-time confirmation, the `wordeasy.app` produced by the same Tauri build as the exact DMG hash above launched with the `wordeasy` window/title and Mac-only storage notice. A superseded old-name build with the same bundle identifier was found running and explicitly quit before interaction, preventing it from being mistaken for the new artifact. The new App initially retained the earlier Research `1 / 10` and one local review, confirming the preserved `desktop:v1` data identity. It then completed a Research reveal + `Good` rating and a Medical reveal + `Good` rating, reaching `3 local reviews`. Both old and new App processes were confirmed stopped after a full quit. Relaunching the exact new App path restored Home with Research `2 / 10` and two words learned, Medical `1 / 10` and one word learned, three local reviews, and the one-day streak. The obsolete generated old-name `.app` was then removed from the ignored build-output directory; only `wordeasy.app` remains there, and the old artifact is recoverable by rebuilding its historical commit. The verified `wordeasy` App was left running for the user.

DEC-030 (2026-09-01) supersedes the local-only desktop product boundary recorded above. The personal Mac app now boots the same cloud learning runtime as `npm run dev:cloud`. Previous `desktop:v1` / Mac-only-notice evidence applies only to the deleted local-only App. Live Email OTP, cloud sync, and a new Apple Silicon `.dmg` were not re-run on the Linux implementation host; TEST-042 live Mac execution remains Not verified until `npm run desktop:build` is run on Apple Silicon with the same public Supabase env as the cloud web build.

## 3. Product and offline browser evidence

`npm run test:e2e` exercised both active modules in desktop and Android-sized Chrome projects:

- Home shows Research 0/10 and Medical 0/10 without horizontal overflow.
- Research Today → Study → reveal → rating persists through reload.
- Medical Today → Study → rating → reload reaches 1/10 without changing Research.
- Primary Study actions remain usable at 320 CSS pixels.

The self-contained offline runner first checks the production service-worker App Shell, then builds a test-only controlled learning fixture. It caches both module queues online, disables networking, rates three Research cards, reloads while offline, and verifies Research 3/10, Medical 0/10, and exactly three account-scoped outbox events. Restoring connectivity retains the three local events. A real Supabase upload after reconnect remains Not verified; transport idempotency and partial failure are covered by sync tests.

Separate component regressions cover a device with no cached learning data: Home receives a null cache, Today receives a failed assignment lookup, and Study receives a failed queue lookup while sync is offline. Each path explicitly says that no replacement cards were generated and exposes no invented module assignment, queue action, Context Card, reveal control, or rating action.

IndexedDB v3 migration tests backfill each legacy outbox card scope from its immutable event and prove that an orphan aborts without clearing the v2 database. Same-epoch cursor recovery covers a skipped canonical state, restart, duplicate acknowledgement, and final trusted local commit. Exact due/lease boundaries and 10,000 active rows cover the bounded claim path.

The formal personal repository has a separate 13-test regression suite. Fresh Home initialization creates only lightweight `0/10` summaries and frozen Review totals without loading the 60-card JavaScript catalog or FSRS. After Home is visibly painted, an idle callback preloads Today/Study routes and the most likely unfinished module's current cards; explicit Today/Study navigation races safely with the same repository bootstrap. The first idle or explicit learning access replaces the versioned local catalog with exactly 30 Research + 30 Medical cards and creates stable assignments; first rating alone loads FSRS. Four focused unit tests plus a Home component regression cover likely-module selection, background-error isolation, cancellable `requestIdleCallback`/timer behavior, and the post-paint/idle boundary. Cross-day reopen materializes due Review cards from IndexedDB without reloading the catalog chunk. Tests also cover zero-Review freezing, repeated Again completion counting, module isolation, the one-time repair of legacy empty Review sets, transient catalog-load retry, stale-row replacement, same-process local-midnight rollover, and both spring/fall `America/New_York` DST cutoffs.

## 4. Performance evidence

Method: Playwright with system Chrome and CDP throttling fallback. This is not a Lighthouse report or an exported Chrome DevTools trace.

Synthetic fixture environment:

```text
Viewport: 393 × 851 CSS pixels (Pixel 5)
Cold: 4× CPU, 150 ms latency, 1.64 Mbps down, 0.77 Mbps up
Warm: primed HTTP/module/Service Worker/IndexedDB cache, 4× CPU
Trials: three cold + three warm; table reports medians
```

| Metric                   | Cold median | Warm median | Applicable budget | Result |
| ------------------------ | ----------: | ----------: | ----------------: | ------ |
| FCP                      |      852 ms |      112 ms |        ≤ 1,800 ms | PASS   |
| LCP                      |      852 ms |      112 ms |        ≤ 2,500 ms | PASS   |
| INP observed             |       56 ms |       56 ms |          ≤ 200 ms | PASS   |
| CLS                      |           0 |           0 |             ≤ 0.1 | PASS   |
| App Shell                |    857.9 ms |    127.1 ms |     warm ≤ 800 ms | PASS   |
| Cached Home              |  1,490.8 ms |    182.5 ms |   warm ≤ 1,200 ms | PASS   |
| Home → first cached card |    161.1 ms |      160 ms |     warm ≤ 300 ms | PASS   |
| Longest observed task    |        0 ms |        0 ms |          reported | PASS   |

Production cloud-entry harness with preseeded account session and IndexedDB cache:

- five-second intercepted Supabase delay: App Shell 200.2 ms, Cached Home 200.2 ms, Home visible 210 ms;
- remote auth and pull requests began at 212 ms and 213 ms, without blocking the cached Home path;
- `remote-sync-complete` was absent while the requests remained delayed;
- forced Supabase request failure kept Cached Home visible and displayed the non-blocking offline-safe state;
- both cloud-startup checks passed.

During the final gate, the synthetic test initially exposed that a double-`requestAnimationFrame` mark could precede Chrome's FCP entry. The implementation now waits for Paint Timing evidence when supported; lint/typecheck and the complete three-run runner then passed. The failed intermediate runs are not presented as passes.

After the IndexedDB v3 remediation, one combined performance run also hit a transient lazy-navigation error before Today. The production build was restored, browser page-error/console/request-failure diagnostics were added, and the failure did not reproduce in a separate three-cold/three-warm run or the subsequent complete cloud-plus-synthetic runner. Both successful reruns are recorded; the intermediate failure is not counted as a pass.

The final rename gate then exposed a separate assertion race: Cached Home was visible in 0.5 seconds, but the test read the after-paint marks before their observer callback had delivered them. The browser test now polls for both mark entries within the original 1.5-second budget and still asserts the recorded App Shell timestamp is below that budget. The complete cloud-delay/failure plus three-cold/three-warm runner passed after this test-only correction, followed by three consecutive cloud-only reruns with both scenarios passing each time; the first failed run is not counted as a pass.

## 5. Bundle and PWA budgets

Final values are recorded by `scripts/check-bundle.mjs` after the production build:

| Budget                            |   Measured |               Limit | Result |
| --------------------------------- | ---------: | ------------------: | ------ |
| Initial JavaScript gzip           |  77.73 KiB |             150 KiB | PASS   |
| Home cumulative JavaScript gzip   | 114.91 KiB |             200 KiB | PASS   |
| Deferred Supabase JavaScript gzip |  52.61 KiB | Reported separately | PASS   |
| Initial CSS gzip                  |   3.33 KiB |              30 KiB | PASS   |
| Compressed precache               | 218.32 KiB |             1.5 MiB | PASS   |

The production build generates a manifest, 192/512/maskable icons, `sw.js`, and Workbox runtime. The service worker precaches static assets only; personal learning data stays in IndexedDB and Supabase Auth/private API responses are not runtime-cached.

The separate Preview build uses `wordeasy Preview`, a distinct `wordeasy:preview:*` IndexedDB namespace, and no Supabase request or credential. Its browser test rates a real Research card, preserves 1/10 across reload, refreshes `/today/research` directly, then reloads Home offline from the generated Service Worker. Initial and post-rating status says `Saved on this device`; `Synced`, `Sync now`, Sign in, and Supabase traffic are absent.

The formal standalone build instead uses `wordeasy`, a stable `wordeasy:standalone:v1:local-user` identity, and separate deferred 60-card and FSRS chunks. Initial JavaScript is 77.90 KiB gzip, Home cumulative JavaScript is 115.04 KiB gzip, CSS is 3.33 KiB gzip, and compressed precache is 180.96 KiB. The checker traverses the static initial + Home import graph and proves that neither canonical card IDs nor FSRS implementation markers are reachable there. Unit/component timing tests prove that prefetch scheduling starts after paint, while the formal Android-sized browser flow holds the idle callback to prove zero cached cards after Home render, then releases it and proves 60 cards are cached before explicit navigation. That flow continues through rating persistence, direct-route refresh, generated-Service-Worker offline restart, and the no-Supabase boundary. This emulated browser evidence does not replace a physical Android install.

The historical desktop web target recorded here used the local-only `wordeasy:desktop:v1:local-user` identity. DEC-030 retires that identity: desktop packaging now boots the cloud learning runtime, allowlists this project's Supabase `https`/`wss` origin, and still emits no Web Manifest, Service Worker, Cloudflare `_headers`, privileged secret, or network/privileged Tauri plugin. Fresh gzip numbers belong with the next desktop-web build on this branch.

## 6. Content and manual review

- Automated validation: 60 total; Research 15 General + 6 Statistics/Methodology + 9 Bioinformatics; Medical 30 across all 13 required categories.
- Source audit: all 60 are original examples with null title/URL/DOI/PMID metadata.
- Product Reviewer v1 manually audited 60/60 cards for context, definitions, paraphrases, Chinese translations, scientific/medical accuracy, classification, duplicates, and source integrity.
- Product Reviewer v1 also inspected desktop and 320×720 Home/Today/Study/reveal/rating flows and the principal text contrast; real devices and screen readers were not used.
- The original Product Reviewer v2 closed PLR-V1-001 through PLR-V1-004 and the TEST-009 evidence gap with no new finding.

## 7. Review gate

- Independent read-only Product v1: complete.
- Independent clean-room Engineering/Security/Performance v1: complete.
- Every v1 finding has an allowed disposition in `REVIEW_RESOLUTION.md`.
- All v1 BLOCKER/HIGH findings were accepted and remediated.
- Original Product v2: PASS WITH EXTERNAL GAPS; no local BLOCKER/HIGH/MEDIUM remains.
- Original Engineering/Security/Performance v2: PASS WITH EXTERNAL GAPS; ENG-V1-001 through ENG-V1-007 closed, ENG-V1-008/009 remain partial only for the explicit external scenarios below.
- TEST-040: manually verified by both original reviewers after remediation and final regression.

## 8. Hosted formal PWA and Preview history

Cloudflare Pages first published the 20-card local-data Preview on 2026-08-28 as deployment `3c0e2abe-b984-46e9-b6c4-d5b3eeec6f6c`. That artifact and deployment `6bc2de09-1e4b-4f45-a7d2-852c9f9936b8` remain history only. The protected Pages project now serves the renamed formal 60-card standalone PWA:

- production URL: `https://wordeasy-preview.pages.dev`;
- atomic deployment URL: `https://d5aed166.wordeasy-preview.pages.dev`;
- deployment ID: `d5aed166-71aa-434c-8785-e8bbca89039c`;
- Cloudflare status/time: `success`, 2026-08-29 11:59 Asia/Shanghai;
- uploaded artifact: the verified `dist-standalone` output packaged at the ZIP root, with no Supabase variables.

The exact uploaded archive and current deployment assets are:

```text
ZIP: /private/tmp/wordeasy-deploy.Nisz2C/wordeasy-standalone.zip
Size: 237,552 bytes
SHA-256: adfb177ebd3996b1cf6a6fda145a6dc46cc504313f7bd62229763e0f2c4e010d
Cloudflare upload: 24/24 files accepted; 23 static assets listed because `_headers` is deployment configuration
Current entry/runtime/cards/FSRS: index-D7JF-oDo.js / standaloneRuntime-BXzlhx0F.js / standaloneCards-BmGvJugB.js / fsrsScheduler-yVBhdOg1.js
```

The formal standalone build checker proves the complete deferred 60-card catalog, static import boundary, exact `wordeasy` manifest identity, and performance/security limits. Post-paint scheduling is covered by unit/component tests, and the held-idle standalone E2E proves that the catalog is absent before the callback and cached after release.

Two separate Cloudflare Access applications continue to protect the fixed hostname and `*.wordeasy-preview.pages.dev`. They reuse one owner-only Allow policy with `Include = Cloudflare Account Member` and `Require = exact owner email`; the email is intentionally not stored in this repository. Application and policy sessions are 30 minutes. Cloudflare IdP is the only identity provider, instant authentication is on, Cloudflare One Client authentication is off, and no Everyone, Bypass, Service Auth, or wider Allow policy is attached. `HttpOnly`, Binding Cookie, and `SameSite=Lax` are enabled, and both applications are hidden from the App Launcher.

Fresh 2026-08-29 requests without cookies did not receive application content:

| Host   | Path                        | Result                     |
| ------ | --------------------------- | -------------------------- |
| fixed  | `/`                         | `302` to Cloudflare Access |
| fixed  | `/today/research`           | `302` to Cloudflare Access |
| fixed  | `/sw.js`                    | `302` to Cloudflare Access |
| fixed  | `/manifest.webmanifest`     | `302` to Cloudflare Access |
| fixed  | `/assets/index-D7JF-oDo.js` | `302` to Cloudflare Access |
| atomic | `/`                         | `302` to Cloudflare Access |
| atomic | `/sw.js`                    | `302` to Cloudflare Access |

Every response included `WWW-Authenticate: Cloudflare-Access`; no App Shell, route, manifest, Service Worker, or current JavaScript asset was returned. The signed login redirect and Access session values are intentionally omitted from this ledger.

Cloudflare reported the formal deployment as `success` and parsed its `_headers`: strict same-origin CSP, `frame-ancestors 'none'`, HSTS, noindex, no-referrer, nosniff, COOP/CORP, a restrictive Permissions Policy, no wildcard CORS, and no-store rules for `/index.html` and `/sw.js`. Local static checks prove the full policy, cloud-build separation, and `/cdn-cgi/` navigation exclusion.

An authenticated owner session loaded the current atomic deployment with the exact `wordeasy` page title and wordmark plus the personal-edition/local-storage notice. It completed one `Good` rating in Research and one in Medical; after reload, Home showed `2 local reviews`, Research `1 / 10`, Medical `1 / 10`, and a one-day streak. The production pointer and both Access applications were unchanged. A previously installed fixed-hostname tab still displayed its older Service Worker-cached Preview shell; no site data was cleared because that would destroy its local progress. The dashboard production pointer, current fixed-host anonymous gate, uploaded asset hashes, and current atomic owner flow together identify the deployed artifact without misreporting that stale installed copy as updated. An offline restart on the Access-protected hosted origin, a raw authenticated-response header capture, and the live `/cdn-cgi/access/logout` endpoint were not invoked; the latter signs out all Access applications. These remaining boundaries are not presented as passed.

## 9. Not verified

The following are implemented/configured but remain outside the evidence available on this host:

- applying migrations to a real/local Supabase Postgres instance;
- live RLS user A/B isolation and ordinary-user Review-event UPDATE/DELETE attacks;
- concurrent assignment RPCs in Postgres;
- deployed `review-sync` Edge Function and trusted replay against real data;
- real Email OTP delivery, resend, expiry, restore, and logout;
- real two-client assignment/progress convergence and upload-after-timeout idempotency;
- Android Chrome and macOS Chrome PWA installation and standalone launch;
- physical Android soft keyboard/safe-area behavior and real screen-reader announcements;
- Access-protected hosted-origin offline restart, live `/cdn-cgi/access/logout` global sign-out, and a raw authenticated-response header capture;
- production-origin Supabase Auth configuration.

## 10. Deferred by explicit MVP scope

Add Word, global search, favorites, statistics dashboards, AI generation, PDF/OCR import, CSV export, Anki export, social features, achievements, push notifications, Android APK/AAB packaging, application-store delivery, Developer ID/notarized third-party Mac distribution, and admin/multi-role UI remain Deferred and have no placeholder route or control.
