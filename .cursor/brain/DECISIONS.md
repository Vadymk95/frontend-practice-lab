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

## [2026-03] ESLint 9 (not 10) — intentional hold

**Decision**: Holding on ESLint 9.x. Not upgrading to ESLint 10 despite it being available.

**Why**: `typescript-eslint` 8.x is incompatible with ESLint 10 — missing `addGlobals()` method causes crash before any rules execute. Will upgrade when typescript-eslint ships a compatible release.

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

## [2026-03] CI: production build + audit + Dependabot

**Decision**: GitHub Actions runs `npm ci` → `npm audit --audit-level=moderate` → lint → format → test → **`npm run build`**. Workflow triggers on PR and push to `master`. Dependabot opens weekly npm update PRs (capped at 8 open).

**Why**: Without a production build step, broken Vite/Rollup/`tsc -b` paths could pass CI. Audit at moderate+ fails the pipeline on registry-reported issues. Dependabot reduces manual drift for security patches. These add **CI minutes only**, not local dev overhead.

**Trade-offs**: `audit-level=moderate` may fail on moderate+ advisories that have no fix yet — then pin, ignore with documented exception, or wait for upstream (team choice).

---

## [2026-03] `manualChunks`: include `@tanstack/query-core`

**Decision**: The `state-vendor` chunk groups `zustand`, `@tanstack/react-query`, and **`@tanstack/query-core`**.

**Why**: `ANALYZE` / rollup-visualizer showed `query-core` split between the entry chunk and `state-vendor` because only `react-query` was matched. Adding `query-core` merges all TanStack Query packages into one cacheable chunk and **reduces entry JS size** (fewer bytes on the app entry module graph).
