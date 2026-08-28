# Release Verification

Updated: 2026-08-28 (Asia/Shanghai)

## 1. Evidence boundary

This ledger distinguishes local implementation evidence from external-environment evidence. A mocked transport, SQL text assertion, browser emulation, or generated PWA asset is not reported as a live Supabase, real-device installation, or screen-reader pass.

Environment used for the final local gate:

```text
macOS 15.7 (Darwin 24.6.0, arm64)
Node.js v24.14.0
npm 11.9.0
Google Chrome 151.0.7922.175
Date: 2026-08-28
```

## 2. Final command ledger

| Command                              | Final result | Evidence                                                                                               |
| ------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------ |
| `npm ci --prefer-offline --no-audit` | PASS         | Clean lockfile install, 539 packages                                                                   |
| `npm run format:check`               | PASS         | All matched files use Prettier style                                                                   |
| `npm run lint`                       | PASS         | ESLint, zero warnings allowed                                                                          |
| `npm run typecheck`                  | PASS         | App project references and Edge Function strict TypeScript                                             |
| `npm run test:unit`                  | PASS         | 14 files / 58 tests                                                                                    |
| `npm run test:component`             | PASS         | 8 files / 34 tests                                                                                     |
| `npm run test:integration`           | PASS         | 4 files / 11 tests                                                                                     |
| `npm run test:content`               | PASS         | 1 file / 22 tests                                                                                      |
| `npm run test:perf`                  | PASS         | 10,000 active-outbox bounded-selection benchmark                                                       |
| `npm test`                           | PASS         | 31 files / 147 tests                                                                                   |
| `npm run content:validate`           | PASS         | 60 cards: 30 Research, 30 Medical; exact distributions and source audit                                |
| `npm run content:seed-sql:check`     | PASS         | Generated seed migration matches canonical JSON                                                        |
| `npm run build`                      | PASS         | 136 modules; PWA `generateSW`; 24-entry production precache                                            |
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
| `npm run build:preview`                | PASS   | Explicit preview mode; 136 modules; 22-entry Workbox precache                                 |
| `npm run test:preview-build`           | PASS   | 77.35/3.33/163.91 KiB; mismatched Preview/production builds fail closed                       |
| `npm run test:pwa:preview`             | PASS   | Standalone Preview manifest, exact icon dimensions, static-only SW, registration              |
| `npm run test:secrets -- dist-preview` | PASS   | Preview output included in the tracked/source/production secret scan                          |
| `npm run test:preview:e2e`             | PASS   | Actual Preview entry: local-only notice/status, rating, reload, direct route, offline restart |

The rebuilt Preview additionally emits a Preview-only Cloudflare `_headers` file. Static verification covers strict same-origin CSP, HSTS, noindex, frame denial, no-referrer, nosniff, COOP/CORP, and disabled camera/microphone/geolocation/payment/USB capabilities. Cloudflare parsed this file for the successful deployment; live Access evidence is recorded in section 8. A raw authenticated-response header capture remains explicitly open.

## 3. Product and offline browser evidence

`npm run test:e2e` exercised both active modules in desktop and Android-sized Chrome projects:

- Home shows Research 0/10 and Medical 0/10 without horizontal overflow.
- Research Today → Study → reveal → rating persists through reload.
- Medical Today → Study → rating → reload reaches 1/10 without changing Research.
- Primary Study actions remain usable at 320 CSS pixels.

The self-contained offline runner first checks the production service-worker App Shell, then builds a test-only controlled learning fixture. It caches both module queues online, disables networking, rates three Research cards, reloads while offline, and verifies Research 3/10, Medical 0/10, and exactly three account-scoped outbox events. Restoring connectivity retains the three local events. A real Supabase upload after reconnect remains Not verified; transport idempotency and partial failure are covered by sync tests.

Separate component regressions cover a device with no cached learning data: Home receives a null cache, Today receives a failed assignment lookup, and Study receives a failed queue lookup while sync is offline. Each path explicitly says that no replacement cards were generated and exposes no invented module assignment, queue action, Context Card, reveal control, or rating action.

IndexedDB v3 migration tests backfill each legacy outbox card scope from its immutable event and prove that an orphan aborts without clearing the v2 database. Same-epoch cursor recovery covers a skipped canonical state, restart, duplicate acknowledgement, and final trusted local commit. Exact due/lease boundaries and 10,000 active rows cover the bounded claim path.

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
| FCP                      |      884 ms |      104 ms |        ≤ 1,800 ms | PASS   |
| LCP                      |      884 ms |      104 ms |        ≤ 2,500 ms | PASS   |
| INP observed             |       56 ms |       48 ms |          ≤ 200 ms | PASS   |
| CLS                      |           0 |           0 |             ≤ 0.1 | PASS   |
| App Shell                |    884.7 ms |    114.3 ms |     warm ≤ 800 ms | PASS   |
| Cached Home              |  1,392.1 ms |    180.1 ms |   warm ≤ 1,200 ms | PASS   |
| Home → first cached card |    471.1 ms |    145.7 ms |     warm ≤ 300 ms | PASS   |
| Longest observed task    |        0 ms |        0 ms |          reported | PASS   |

Production cloud-entry harness with preseeded account session and IndexedDB cache:

- five-second intercepted Supabase delay: App Shell and Cached Home marks 200.2 ms, Home visible 211 ms;
- remote auth and pull requests began at 216 ms and 224 ms, after cached Home was already visible;
- `remote-sync-complete` was absent while the requests remained delayed;
- forced Supabase request failure kept Cached Home visible and displayed the non-blocking offline-safe state;
- both cloud-startup checks passed.

During the final gate, the synthetic test initially exposed that a double-`requestAnimationFrame` mark could precede Chrome's FCP entry. The implementation now waits for Paint Timing evidence when supported; lint/typecheck and the complete three-run runner then passed. The failed intermediate runs are not presented as passes.

After the IndexedDB v3 remediation, one combined performance run also hit a transient lazy-navigation error before Today. The production build was restored, browser page-error/console/request-failure diagnostics were added, and the failure did not reproduce in a separate three-cold/three-warm run or the subsequent complete cloud-plus-synthetic runner. Both successful reruns are recorded; the intermediate failure is not counted as a pass.

## 5. Bundle and PWA budgets

Final values are recorded by `scripts/check-bundle.mjs` after the production build:

| Budget                            |   Measured |               Limit | Result |
| --------------------------------- | ---------: | ------------------: | ------ |
| Initial JavaScript gzip           |  77.45 KiB |             150 KiB | PASS   |
| Home cumulative JavaScript gzip   | 114.38 KiB |             200 KiB | PASS   |
| Deferred Supabase JavaScript gzip |  52.61 KiB | Reported separately | PASS   |
| Initial CSS gzip                  |   3.33 KiB |              30 KiB | PASS   |
| Compressed precache               | 217.81 KiB |             1.5 MiB | PASS   |

The production build generates a manifest, 192/512/maskable icons, `sw.js`, and Workbox runtime. The service worker precaches static assets only; personal learning data stays in IndexedDB and Supabase Auth/private API responses are not runtime-cached.

The separate Preview build uses `Article English Preview`, a distinct `wordeasy:preview:*` IndexedDB namespace, and no Supabase request or credential. Its browser test rates a real Research card, preserves 1/10 across reload, refreshes `/today/research` directly, then reloads Home offline from the generated Service Worker. Initial and post-rating status says `Saved on this device`; `Synced`, `Sync now`, Sign in, and Supabase traffic are absent.

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

## 8. Hosted Preview deployment evidence

Cloudflare Pages published the local-data Preview successfully on 2026-08-28:

- production URL: `https://wordeasy-preview.pages.dev`;
- atomic deployment URL: `https://3c0e2abe.wordeasy-preview.pages.dev`;
- deployment ID: `3c0e2abe-b984-46e9-b6c4-d5b3eeec6f6c`;
- uploaded artifact: the verified `dist-preview` output, with no Supabase variables.

A fresh final `dist-preview` rebuild matched every extracted file in the uploaded ZIP (`diff -qr` returned no differences), so the documented source produces the deployed artifact byte-for-byte.

Two separate Cloudflare Access applications protect the fixed hostname and `*.wordeasy-preview.pages.dev`. They reuse one owner-only Allow policy with `Include = Cloudflare Account Member` and `Require = exact owner email`; the email is intentionally not stored in this repository. Application and policy sessions are 30 minutes. Cloudflare IdP is the only identity provider, instant authentication is on, Cloudflare One Client authentication is off, and no Everyone, Bypass, Service Auth, or wider Allow policy is attached. `HttpOnly`, Binding Cookie, and `SameSite=Lax` are enabled, and both applications are hidden from the App Launcher.

Fresh requests without cookies did not receive application content:

| Host   | Path                        | Result                     |
| ------ | --------------------------- | -------------------------- |
| fixed  | `/`                         | `302` to Cloudflare Access |
| fixed  | `/today/research`           | `302` to Cloudflare Access |
| fixed  | `/sw.js`                    | `302` to Cloudflare Access |
| fixed  | `/theme-init.js`            | `302` to Cloudflare Access |
| fixed  | `/manifest.webmanifest`     | `302` to Cloudflare Access |
| fixed  | `/assets/index-D4LvTm3l.js` | `302` to Cloudflare Access |
| atomic | `/`                         | `302` to Cloudflare Access |
| atomic | `/sw.js`                    | `302` to Cloudflare Access |

The fixed-host response included `WWW-Authenticate: Cloudflare-Access` and a secure, HttpOnly Access session cookie. The signed login redirect value is intentionally omitted from this ledger.

An authenticated owner session loaded Home, the direct `/today/medical` route, and the atomic deployment. On the atomic origin, the browser opened Research Today, revealed a card, rated it Good, advanced to the next card, showed `Saved on this device · 1 local review`, and retained that state after reload. Browser console warning and error logs were empty on both protected origins.

Cloudflare's deployment view reported `success` and parsed the uploaded `_headers`, including the strict Preview CSP. Local static checks prove the complete header policy, no wildcard CORS, cloud-build separation, and the `/cdn-cgi/` navigation exclusion. They also execute two deliberately mismatched builds and prove that Preview runtime without Preview Vite mode, and Preview Vite mode without Preview runtime, both fail before an artifact is emitted. The Preview Playwright flow independently proves Service Worker installation, rating persistence, direct-route reload, and offline App Shell restart. An offline restart on the Access-protected hosted origin and the live `/cdn-cgi/access/logout` endpoint were not invoked; the latter signs out all Access applications. These remaining boundaries are not presented as passed.

## 9. Not verified

The following are implemented/configured but remain outside the evidence available on this host:

- applying migrations to a real/local Supabase Postgres instance;
- live RLS user A/B isolation and ordinary-user Review-event UPDATE/DELETE attacks;
- concurrent assignment RPCs in Postgres;
- deployed `review-sync` Edge Function and trusted replay against real data;
- real Email OTP delivery, resend, expiry, restore, and logout;
- real two-client assignment/progress convergence and upload-after-timeout idempotency;
- Android Chrome and macOS Chrome installation and standalone launch;
- physical Android soft keyboard/safe-area behavior and real screen-reader announcements;
- Access-protected hosted-origin offline restart, live `/cdn-cgi/access/logout` global sign-out, and a raw authenticated-response header capture;
- production-origin Supabase Auth configuration.

## 10. Deferred by explicit MVP scope

Add Word, global search, favorites, statistics dashboards, AI generation, PDF/OCR import, CSV export, Anki export, social features, achievements, push notifications, native wrappers, stores, and admin/multi-role UI remain Deferred and have no placeholder route or control.
