# Product & Learning Review v1

- Date: 2026-08-26
- Mode: independent, read-only first review
- Reviewer: `product_learning_reviewer`

## Executive summary

- The reviewer manually audited all 60/60 canonical cards. No material medical, statistical, bioinformatics, English-definition, Chinese-translation, classification, duplication, or source-integrity defect was found.
- Research distribution is correct: 15 General Research, 6 Statistics/Methodology, and 9 Bioinformatics cards.
- Medical contains 30 cards across all 13 required categories and the required range of context genres.
- Context-first reveal/rating behavior, mobile layout, and the offline App Shell passed the available automated and browser checks.
- The release gate does not pass yet: two HIGH, one MEDIUM, and one NOTE finding remain for Root disposition.

## Commands executed

| Command / check                                                                        | Result                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `npm run content:validate`                                                             | PASS, 60 cards                                         |
| `npm run test:content`                                                                 | PASS, 22/22                                            |
| `npm run test:component`                                                               | PASS, 29/29                                            |
| `npm run test:unit`                                                                    | PASS, 37/37                                            |
| `npm run test:integration`                                                             | PASS, 9/9                                              |
| `npm run test:e2e`                                                                     | Initial sandbox port `EPERM`; approved rerun PASS, 6/6 |
| `npm run content:seed-sql:check`                                                       | PASS                                                   |
| `npm run test:pwa`                                                                     | PASS                                                   |
| `npm run test:pwa:offline`                                                             | PASS, 1/1                                              |
| Canonical JSON counts, uniqueness, categories, genres, collocations, and source fields | PASS                                                   |
| In-app browser at desktop and 320×720 through Home, Today, Study, Reveal, rating       | PASS                                                   |
| Remote-font, browser full-dataset import, and Deferred-entry inspection                | PASS                                                   |
| Main text color contrast calculation                                                   | PASS; lowest checked ratio 5.29:1                      |

## 60-card audit coverage

The reviewer checked 60/60 cards for natural context, English meaning, plain-English paraphrase, Chinese translation, medical/research accuracy, classification, duplication, and source integrity.

- Research General: 15/15.
- Statistics/Methodology: 6/6.
- Bioinformatics: 9/9.
- Medical Anatomy: 2/2; Physiology: 2/2; Pathology: 2/2; Symptoms: 3/3; Signs: 2/2; Diseases: 2/2; Diagnosis: 3/3; Laboratory: 2/2; Imaging: 2/2; Treatment: 3/3; Pharmacology: 2/2; Surgery/Procedures: 2/2; Clinical expressions: 3/3.
- All 60 card keys, IDs, word senses, and contexts are unique.
- Every card has three natural collocations.
- All 60 are labeled `original_example`; title, URL, DOI, and PMID are null. No fabricated source was found.

## Findings

### PLR-V1-001

- Severity: HIGH
- Requirement: CORE-005, MED-001, SCOPE-001, TEST-004, TEST-006
- Evidence: the default `npm run dev` demo imports only `DEMO_RESEARCH_CARDS` and calls only `ensureResearchNew`. Medical receives an empty Review set but no New assignment. Home shows Medical `0 / 0`, and E2E explicitly expects that value.
- File / route / component: `src/data/demoLearningRepository.ts`, `src/data/demo/demoCards.ts`, `tests/e2e/localLearning.spec.ts`, `/`, `/today/medical`
- Reproduction: run `npm run dev`; Home shows Medical `0 / 0`, and Medical Today has no new words.
- User impact: the default runnable version cannot exercise Medical English, so E2E does not prove Medical 10 or isolation between two active modules.
- Recommended fix: derive a controlled Medical subset from canonical data, implement a stable 10-card demo assignment, and add Medical Home → Today → Study → rating → reload E2E plus cross-module isolation assertions.

### PLR-V1-002

- Severity: MEDIUM
- Requirement: CORE-001, CORE-002, CONTENT-001..011, TEST-002, TEST-037
- Evidence: `src/data/demo/demoCards.ts` and `data/seed-data.json` are independently maintained. For example, the demo `corroborate` context is imaging/histopathology while the canonical context uses a discovery cohort and independent sample. UI E2E exercises only demo data.
- File / route / component: `src/data/demo/demoCards.ts`, `data/seed-data.json`, `tests/e2e/localLearning.spec.ts`
- Reproduction: compare the Research study route with the canonical JSON record for `corroborate`.
- User impact: the 60/60 reviewed content is not necessarily what product E2E displays, and the two sources can continue to drift.
- Recommended fix: deterministically derive the demo subset from the canonical dataset, or enforce field-level parity and add a canonical-card → repository → ContextCard integration test without putting the complete dataset in the production initial bundle.

### PLR-V1-003

- Severity: HIGH
- Requirement: TEST-001, TEST-038, release gate, and the AGENTS.md P0 completion rule
- Evidence: `docs/TRACEABILITY.md` still reports the M1 baseline and 32 tests. Many implemented CONTENT, PWA, Auth, Sync, and Medical rows remain Planned or In progress.
- File / route / component: `docs/TRACEABILITY.md`
- Reproduction: compare the matrix with the current test suites and build artifacts.
- User impact: release evidence is inaccurate and cannot distinguish implementation, automation, manual verification, and external scenarios that remain unverified.
- Recommended fix: update every row from current evidence. Keep real Supabase, real-device installation, and two-client scenarios Not verified.

### PLR-V1-004

- Severity: NOTE
- Requirement: reviewer checklist, CONTENT-010
- Evidence: the assigned reviewer checklist named `data/seed-data.csv`, but the repository intentionally uses `data/seed-data.json` plus `data/import-template.csv`, consistent with the requirements and implementation plan.
- File / route / component: `data/seed-data.json`, `data/import-template.csv`
- Reproduction: `data/seed-data.csv` does not exist.
- User impact: there is no complete 60-row CSV mirror to audit, but this is not a failure of CONTENT-010.
- Recommended fix: name `data/import-template.csv` in future reviewer instructions; only add a complete CSV if it is generated deterministically from canonical JSON.

## Pass/fail table

| Scope                  | Result           | Notes                                                                             |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------- |
| CORE-001..004          | PASS             | Context-first normalized card and reveal behavior                                 |
| CORE-005               | PARTIAL / FAIL   | Default runnable demo has no Medical assignment                                   |
| CORE-006..009          | PASS             | New/Review, distinct completion, learned sense, streak covered                    |
| CORE-010, SCOPE-001    | FAIL for release | HIGH findings and external verification remain                                    |
| RES-001..003           | PASS             | 5+2+3, content, and all-or-nothing shortage                                       |
| MED-001                | PARTIAL / FAIL   | SQL exists; demo/E2E and real Supabase remain incomplete                          |
| MED-002..003           | PASS             | 30 cards, 13 categories, genre range                                              |
| SCOPE-002, CONTENT-012 | PASS             | No Deferred route or placeholder found                                            |
| UI-001..014            | PASS with limits | Component and desktop/mobile emulation pass; real devices unverified              |
| A11Y-001               | PASS with limits | Semantics, focus, live region, reduced motion, contrast; screen reader unverified |
| CONTENT-001..011       | PASS             | Automated validation plus 60/60 manual audit                                      |
| TEST-027               | NOT VERIFIED     | Real Android/macOS installation not run                                           |
| TEST-038               | PASS             | Independent and read-only; no Engineering report read                             |
| TEST-039..040          | PENDING          | Resolution and v2 required                                                        |

## Remaining blockers

- PLR-V1-001: no Medical New cards in the default runnable environment.
- PLR-V1-003: Traceability cannot yet support a release statement.
- Real Supabase Medical 10, Research 5+2+3, concurrent stable assignment, and second-client behavior remain unverified.
- Product v2 has not run.

## Manual verification required

- Android Chrome installation, home-screen launch, keyboard, and safe-area behavior.
- macOS Chrome installation and standalone launch.
- Real Supabase Email OTP and two-client assignment/progress consistency.
- Real screen reader behavior for reveal, rating, and live announcements.
- Product Reviewer v2 after fixes.

## Files changed

None.
