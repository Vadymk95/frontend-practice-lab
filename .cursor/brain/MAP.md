# Architecture Map

## Entry Points

| File                   | Role                                                |
| ---------------------- | --------------------------------------------------- |
| `index.html`           | HTML shell — i18n-loading class for FOUC prevention |
| `src/main.tsx`         | Root: i18n init → QueryClient → Router providers    |
| `src/App.tsx`          | Layout shell: ErrorBoundary → Header/Main/Footer  |
| `src/router/index.tsx` | Router assembly — merges route modules              |

## Adding a New Page

1. Create `src/pages/FooPage/FooPage.tsx` + `index.ts` (lazy export where applicable)
2. Register in `src/router/modules/base.routes.tsx` with `WithSuspense` for lazy pages
3. Add route name to `src/router/routes.ts`
4. Add i18n namespace under `public/locales/{lng}/` as needed

## Adding a New Feature

1. Global state → `src/store/<domain>/<domain>Store.ts` + tests + `index.ts` barrel where used
2. Hooks → `src/hooks/<domain>/` (tests alongside)
3. Components → `src/components/<domain>/ComponentName/` (tsx + `useComponentName` + test)
4. Server/API → `src/lib/api/`; shared fetch via `client.ts`

## Adding a shadcn Component

Use the shadcn CLI per project `components.json`; primitives land in `src/components/ui/`. Config targets Tailwind v4 (no separate `tailwind.config.ts`).

## State Boundaries

```
Zustand  →  global client state (user, session, progress, UI, presets, …)
TanStack →  server data, caching, background refetch
Local    →  component-only state (useState)
```

## Routing

| Path              | Page            | Notes                          |
| ----------------- | --------------- | ------------------------------ |
| `/`               | HomePage        | index route, not lazy          |
| `/session/play`   | SessionPlayPage | lazy + WithSuspense            |
| `/session/summary`| SummaryPage     | lazy + WithSuspense            |
| `*`               | NotFoundPage    | lazy + WithSuspense            |
| `/dev-playground` | DevPlayground   | **DEV only** — omitted in prod |

## i18n Flow

```
app start → i18next init → loads common + errors + lazy page namespaces
→ RootProviders renders (isI18nReady gate)
→ document.lang set
→ HMR: useI18nReload watches public/locales/** in dev
```

## Data / Questions

```
public/data/manifest.json     — category list and counts
public/data/<slug>.json       — question payloads per category
src/lib/data/schema.ts        — Zod schema (build/CI validation)
src/hooks/data/             — category loading helpers
```

Storage for client prefs: `src/lib/storage/` (localStorage abstraction).

## Algorithm / Session

Adaptive selection and session orchestration live under `src/lib/algorithm/`; wired from session-related stores and session pages.

## CSS / Theming

```
src/index.css — single source of truth for Tailwind v4:
  @import "tailwindcss"    — base + utilities
  @import "tw-animate-css" — animation utilities
  @custom-variant dark     — class-based dark mode
  @theme inline {}         — maps TW utility names → CSS variables
  :root / .dark {}         — HSL design tokens
```

Brand color: `--primary` in `:root`. New color token: add HSL in `:root`, then map in `@theme inline`.

## CI / Supply chain

| Artifact                   | Role                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `.github/workflows/ci.yml` | PR + push `master`: audit (moderate+), lint, format, test, **build** |
| `.github/dependabot.yml`   | Weekly npm version PRs (limit 8 open)                                |
