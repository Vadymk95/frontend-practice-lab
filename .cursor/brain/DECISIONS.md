# Architectural Decisions

## [2026-03] Tailwind v4 migration

**Decision**: Migrated from Tailwind v3 (config in `tailwind.config.ts`) to Tailwind v4 (config in `src/index.css`).

**Why**: v4 uses a Vite-native plugin (`@tailwindcss/vite`) which is faster and eliminates PostCSS as a build dependency. CSS-based config (`@theme inline`) is more collocated with actual styles.

**Trade-offs**: The `container` utility no longer has a JS-configurable `center`/`padding` option — apply utilities directly. `tailwindcss-animate` replaced by `tw-animate-css` (CSS import, no PostCSS plugin).

---

## ~~[2026-03] rolldown-vite over standard vite~~ — SUPERSEDED by [2026-04] Vite 8 migration

**Was**: Using `npm:rolldown-vite` aliased as `vite` (experimental, pre-stable).

**Superseded**: Story 6.7 migrated to **Vite 8 with stable native Rolldown**. See below.

---

## [2026-04] Vite 8 migration — stable Rolldown (Story 6.7)

**Decision**: Migrated from `rolldown-vite@7.x` (experimental) to `vite@^8.0.0` (Rolldown native, stable).

**Why**: Vite 8 ships Rolldown as the official bundler — no longer an experimental alias. OXC minifier retained. All plugins confirmed compatible (see SKELETONS.md). Node.js ≥ 20.19 or ≥ 22.12 required (project runs Node 24).

**Trade-offs**: None for this project — plugin matrix was verified clean. The `overrides` in `package.json` are security patches only (axios, follow-redirects, serialize-javascript), not bundler workarounds.

---

## ~~[2026-03] ESLint 9 (not 10) — intentional hold~~ — CLOSED 2026-09-16

**Was**: ESLint 10 crashed `typescript-eslint` 8.5x (`addGlobals()` missing).

**Closed**: `typescript-eslint` 8.70 peers `^10.0.0`; ESLint 10.10 + `@eslint/js` 10 installed, lint runs clean on the whole tree (0 errors). `eslint-plugin-import` 2.32 and `eslint-plugin-jsx-a11y` 6.10 still declare `eslint ^9` as their peer — installed under `legacy-peer-deps`, verified working on 10; re-check when they publish a 10 peer and drop the flag then. Dependabot keeps `eslint >=11` ignored.

---

## ~~[2026-03] @vitejs/plugin-react v5 (not v6)~~ — SUPERSEDED

**Was**: Holding on v5.x because v6 requires Vite 8+.

**Superseded**: Story 6.7 upgraded to `@vitejs/plugin-react@6.0.1` alongside Vite 8. Babel dependency removed as expected — no Babel usage in this project.

---

## [2026-03] No FSD architecture in this template

**Decision**: Using simple folder structure (`components/`, `hooks/`, `store/`, `lib/`, `pages/`) instead of FSD layers.

**Why**: FSD is powerful but adds onboarding friction for a template. This template is meant to be cloned and extended. FSD can be layered on by the consumer if needed. Vibeten uses FSD and its rules can serve as reference.

---

## [2026-03] Zustand for global state, TanStack Query for server state

**Decision**: Hard boundary — no Zustand for server data, no TanStack Query for pure UI state.

**Why**: Mixing responsibilities leads to cache inconsistency and double-refetch bugs. Zustand + devtools gives Redux-like observability for client state. TanStack Query owns all async lifecycle (loading, error, stale, refetch).

---

## ~~[2026-03] CI: production build + audit + Dependabot~~ — SUPERSEDED 2026-09-16 by the one-chain gate

**Now**: CI's `validate` job, the `deploy` job and the pre-push hook all call `npm run verify:ci` (audit gate at high/critical with an expiring allow-list, then the offline chain); `deploy` builds after it; e2e is its own job. Dependabot is grouped, cooled down and capped at 5 (see `.github/dependabot.yml`). Owner of the law: `AGENTS.md` § The gate; timings: `VERIFICATION.md`.

**Was**: GitHub Actions ran `npm ci` → `npm audit --audit-level=moderate` → lint → format → test → **`npm run build`** as separate steps, and Dependabot opened weekly singleton PRs (capped at 8 open).

**Why**: Without a production build step, broken Vite/Rollup/`tsc -b` paths could pass CI. Audit at moderate+ fails the pipeline on registry-reported issues. Dependabot reduces manual drift for security patches. These add **CI minutes only**, not local dev overhead.

**Trade-offs**: `audit-level=moderate` may fail on moderate+ advisories that have no fix yet — then pin, ignore with documented exception, or wait for upstream (team choice).

---

## [2026-03] `manualChunks`: include `@tanstack/query-core`

**Decision**: The `state-vendor` chunk groups `zustand`, `@tanstack/react-query`, and **`@tanstack/query-core`**.

**Why**: `ANALYZE` / rollup-visualizer showed `query-core` split between the entry chunk and `state-vendor` because only `react-query` was matched. Adding `query-core` merges all TanStack Query packages into one cacheable chunk and **reduces entry JS size** (fewer bytes on the app entry module graph).

## [2026-09-16] Adaptive weights: per-question outcome, category rate only as a prior

**Decision**: A question's weight now moves by that question's own outcome — wrong multiplies by
`HIGH_ERROR_MULTIPLIER` (capped at `MAX_WEIGHT`), correct by `LOW_ERROR_MULTIPLIER` (floored at
`MIN_WEIGHT`). The per-category error rate keeps its own update (`updateErrorRate`) because the home
widget and the summary's focus areas read it, but it no longer drives the weight of the question
just answered. It is instead the **prior** for a question that has no stored weight:
`rate > HIGH_ERROR_THRESHOLD → DEFAULT × HIGH`, `rate < LOW_ERROR_THRESHOLD → DEFAULT × LOW`, else
`DEFAULT` — the same step `calculateWeight` already computed, applied once to `DEFAULT_WEIGHT`.
`sampleWeighted` and `sampleWithCategoryGuarantee` take `errorRates` as an optional last parameter
so the prior reaches sampling; `useSessionSetup` passes `useProgressStore.use.errorRates()`.
`sampleWeighted` also lost its `count >= questions.length` shuffle short-circuit.

**Why**: Two defects cancelled the adaptive layer out. (1) The configurator defaults to "all
available", so `count >= pool.length` was the *normal* path and it returned a plain shuffle — the
weights were computed, stored and never used. (2) Deriving the question's weight from the category
rate meant a correct answer inside a weak category *doubled* the weight of the question the user had
just got right, while questions never answered stayed at `DEFAULT_WEIGHT` forever, so a weak
category kept re-serving the same handful of questions.

**Trade-offs / not done**: No spaced repetition. There is still no per-question timestamp, no
interval and no scheduling — weights are a frequency bias, not an SRS, and adding one would need a
storage-schema change and a migration. Weighted sampling without replacement over the full pool is
O(n²) per session; at ~955 questions and one sample per session that is not worth optimising.

---

## [2026-09-16] Exact difficulty x mode counts in the manifest

**Decision**: `generate-manifest` writes a `matrix` of exact counts per
difficulty per mode alongside the existing per-axis `counts`, and the
configurator reads it instead of estimating `round(diffCount * modeTotal / total)`.

**Why**: the estimate treated the two filter axes as independent. Measured
against the real data it was wrong for 122 of 216 category x difficulty x mode
combinations, and in 10 of them it advertised questions for an empty pool — Start
was enabled, the play route found nothing and bounced the user home. Counting at
build time is free; the alternative (fetching every category file to count on the
home screen) is not.

**Trade-offs**: the manifest grows by nine numbers per category and a stale
manifest no longer matches the type. Regenerating is one command and is already
part of `npm run build`. The empty-pool bounce is now also explained by a
`noQuestionsMatch` flash rather than a silent redirect.

**Status**: `public/data/manifest.json` was regenerated with the matrix on the same branch (after the data
hygiene commit that made `data:check` green), so the served manifest and the type agree.

---

## [2026-09-16] Question content: a token parser, not a markdown dependency

**Decision**: Question stems, explanations, options and reference answers render through
`src/lib/utils/inlineMarkdown.ts` (code spans, bold, line breaks) and
`src/lib/utils/markdownBlocks.ts` (fenced blocks), rendered as React nodes by
`components/common/InlineMarkdown`. No markdown library, and no `dangerouslySetInnerHTML`
outside the Shiki-rendered `CodeBlock`.

**Why**: The bank uses backticks in 176 stems and 227 explanations, bold in 15, plus hard
newlines — a strict subset that fits in about 60 lines of parsing with unit tests. A markdown
library would pull in an HTML pipeline for content that is authored by an agent, which is
exactly the input a sanitiser has to be trusted with; emitting text nodes makes the injection
question moot. Anything unsupported stays literal, so a new marker degrades to visible text
rather than to broken layout.

**Trade-offs**: Tables, links and lists in question content will not render. If the bank ever
needs them, extend the token list rather than swapping in a library — the store of authored
content is the constraint, not the parser.

---

## [2026-09-16] Dependency pass after five dormant months — one major per commit, holds recorded

**Decision**: `npm audit fix` + in-range update first (19 → 0 vulnerabilities), then majors one group per commit, each proven by tsc + lint + the unit suite before the commit: ESLint 10, Vitest 5 + coverage-v8 5 + jsdom 30 + jest-dom 7, i18next 26 + react-i18next 17 + http-backend 4 (dropped the removed `initImmediate` option; init was already awaited by the i18n gate), lint-staged 17 + commitlint 21, lucide-react 1.x, `@types/node` 24 (down from 25, to match `engines.node`). Dependabot now groups PRs, waits 7/14 days and carries an ignore per hold.

**Holds, each with its lift trigger**: TypeScript stays 5.9 — `typescript-eslint` 8.70 peers `<6.1.0`, and a 7.x bump breaks `npm install` outright (ERESOLVE), not just linting; lift when typescript-eslint publishes a `>=6.1` peer. `@types/node` follows `engines.node` (24), not the newest defs; moves with the Node bump.

**Why**: the repo could not be pushed at all — the pre-push audit was red on 13 high advisories and the eight Dependabot singleton PRs from April had never been merged. Majors landed one group at a time so a red group reverts alone. The first run reverted five groups on a false "lint crashed" verdict (the react-hooks warning text starts with "Error:"); the verdict now reads ESLint's own summary line.
