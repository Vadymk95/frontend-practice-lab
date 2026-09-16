# Verification — what runs, what it costs, what was left out

The gate law (which command runs at which moment) is owned by `AGENTS.md` § The gate. This note holds the
measurements behind it and the things deliberately not in the chain, each with the trigger that would add it.

## Stage timings — measured 2026-09-16 (Apple Silicon, Node 24.16, warm caches)

| Stage           | Command                 | Time   | Notes                                                              |
| --------------- | ----------------------- | ------ | ------------------------------------------------------------------ |
| audit gate      | `npm run audit:gate`    | 1.0 s  | high/critical block; fail-closed; allow-list with expiry           |
| hooks check     | `npm run check:hooks`   | 0.3 s  | skipped on CI; refuses an unset or absolute `core.hooksPath`       |
| format          | `npm run format:check`  | 2.1 s  |                                                                    |
| lint            | `npm run lint`          | 6.4 s  | ESLint 10, type-aware; 4 pre-existing `react-hooks` warnings       |
| types           | `npm run typecheck`     | 3.8 s  | `tsc -b` over the four project references                          |
| data schema     | `npm run validate:data` | 0.3 s  | Zod, 18 files                                                      |
| data quality    | `npm run data:check`    | 0.3 s  | duplicates, blanks, translations, index bias; length bias = warning |
| unit            | `npm run test`          | 6.6 s  | Vitest 5, 56 files / 571 tests, jsdom                              |
| **verify:ci**   | all of the above        | ~21 s  | the pre-push hook and CI's `validate` job                           |
| e2e             | `npm run test:e2e`      | 18–26 s | Playwright, 80 runs = 40 specs × (desktop Chromium, iPhone 14 on Chromium); CI only |
| build           | `npm run build`         | 11.4 s | manifest + `tsc -b` + Vite 8 (Rolldown); `dist/` 33 MB with source maps |

Per change the iterate rung is `npm run verify:iter` (types + changed tests): seconds.

## Flakes seen and what was done

- 3 of 80 e2e runs timed out waiting for the lazy-loaded play page under six parallel workers against one
  Vite dev server (2026-09-16). The helper's 8 s wait was the wrong budget for a cold transform, not a
  product defect; raised to 20 s with the reason in the spec. CI runs one worker and never hit it.
- The header language-toggle spec read the DOM synchronously after the click; the label now follows
  i18next's `languageChanged`, so the assertion is web-first (auto-retrying).

## Deliberately not in the gate (with the trigger that would add it)

- **Coverage floor** — no threshold yet; add one from a measured baseline when the unit suite stops growing
  by hundreds of tests per pass (it went 338 → 571 on 2026-09-16).
- **Mutation testing (Stryker)** — the templates run it weekly; here the suite is young and the run would be
  the longest thing in the repo. Trigger: a bug that the unit suite should have caught reaches `master`.
- **Size budget** — the app is a single PWA bundle with data fetched per category; measure `dist/assets`
  once and set a ceiling when a dependency pass moves it noticeably (Vite 8 build prints the sizes).
- **Gate tracer / phases** — the templates' machinery for repos with many stages; this chain is 21 s.
- **`docs:check`** — the drift check the templates run on documentation; the doc surface here is three files
  and a brain. Trigger: a second contradiction between docs and behaviour found by hand.
- **WebKit** — the mobile project runs the iPhone 14 descriptor on Chromium; WebKit is optional locally
  (`npx playwright install webkit`) and not installed on CI.
