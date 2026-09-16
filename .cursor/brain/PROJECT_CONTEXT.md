# InterviewOS — Project Context

## Purpose

Personal mobile-first interview preparation SPA for frontend engineers. Daily habit tool (1-hour sessions) to combat cognitive atrophy from AI-assisted workflows. Covers trainee → principal/staff engineer depth across 18 topic categories (952 bilingual RU/EN questions). Adaptive algorithm: per-question weights moved by that question's own outcome, per-category error rates as the prior for unseen questions; the session pool is weight-ordered.

PRD: `_bmad-output/planning-artifacts/prd.md`

## Tech Stack

| Layer        | Choice                           | Version                   |
| ------------ | -------------------------------- | ------------------------- |
| UI           | React                            | 19                        |
| Language     | TypeScript                       | 5.9 strict                |
| Bundler      | Vite (Rolldown native)           | 8                         |
| Styling      | Tailwind CSS                     | **v4** (CSS-based config) |
| Components   | shadcn/ui (new-york)             | latest                    |
| Global State | Zustand + devtools               | 5                         |
| Server State | TanStack Query                   | 5                         |
| Routing      | React Router                     | 7                         |
| Forms        | react-hook-form + zod            | 7 / 4                     |
| i18n         | i18next + react-i18next          | 25 / 16                   |
| Testing      | Vitest + Testing Library         | 4                         |
| Linting      | ESLint flat config               | 9                         |
| Formatting   | Prettier                         | 3                         |
| Git hooks    | Husky + commitlint + lint-staged | 9 / 20                    |
| PWA          | vite-plugin-pwa                  | latest                    |

## Architecture

```
src/
  components/
    common/       # App-level: ErrorBoundary, PWA install/update toasts, FlashBanner, …
    layout/       # Header, Footer, Main
    ui/           # shadcn primitives
  hocs/           # WithSuspense
  hooks/
    analytics/    # useAnalytics for interaction/event tracking
    i18n/         # useI18nReload (dev HMR)
    session/      # Session setup
    data/         # Category / question loading
    ui/           # Theme, language
  lib/
    analytics/    # Event contracts + analytics facade
    api/          # Fetch client + examples
    algorithm/    # Adaptive question selection
    data/         # Zod question schema + types
    i18n/         # i18next setup, constants, types
    storage/      # localStorage service + zod schemas + types
    queryClient   # TanStack Query factory
    utils         # cn(), timers, keys, …
    shiki.ts      # Code highlighting
  pages/
    HomePage/
    SessionPlayPage/
    SummaryPage/
    NotFoundPage/
    DevPlayground/   # dev sandbox only
  router/
    index.tsx
    modules/      # base.routes.tsx
    routes.ts
  store/
    user/         # userStore
    session/      # sessionStore
    progress/     # progressStore
    ui/           # uiStore
    presets/      # presetStore
    utils/        # createSelectors
  test/           # setup, renderWithProviders
public/
  data/           # manifest + per-category JSON question files
  locales/        # i18n JSON per language
```

## Key Patterns

### Tailwind v4 (no tailwind.config.ts)

- Config in `src/index.css` via `@theme inline {}`
- Dark mode via `@custom-variant dark (&:where(.dark, .dark *))`
- Animations via `tw-animate-css` (CSS import)
- Custom motion: `@keyframes` + `--animate-*` in `@theme`

### Components: presentational + hook

Each feature component folder: `ComponentName.tsx`, `useComponentName.ts`, tests.

### Stores: Zustand + createSelectors

Use `useXStore.use.field()` pattern; tests subscribe via base store where needed (see SKELETONS).

### Pages: lazy by default (except Home)

Lazy pages exported from `index.ts`; router wraps with `WithSuspense`.

### i18n

- Default language: **Russian**. RU/EN toggle; persistence via localStorage.
- Code snippets in UI stay English regardless of locale.
- `common` and `errors` always loaded; home, session, summary, question namespaces as routes require.

### Data layer

- Question content: `public/data/` (manifest + category JSON), validated against `src/lib/data/schema.ts` (`validate:data`) and the content-quality gate `src/scripts/check-data-quality.ts` (`data:check`) at commit, push and CI. Options are shuffled at render; answers are stored as original option indices.
- Client persistence: `src/lib/storage/` — swappable later (e.g. cloud sync).

## Agent Rules

Read `.cursor/rules/` before implementation. Core entry points: `global.mdc`, `agent-pipeline.mdc`, `workflow.mdc`, `project-config.mdc`, `engineering-standards.mdc`, `react-patterns.mdc`, `state-management.mdc`, `routing.mdc`, `api.mdc`, `test-driven-development.mdc`, `resilience.mdc`, `constants.mdc`, `performance.mdc`.

## Dev Tooling

The gate law (what runs at iterate / commit / push / CI) lives in `AGENTS.md` § The gate — one chain, `verify` in `package.json`, called by the pre-push hook, CI and deploy. Per change: `npm run verify:iter`. Build: `npm run build` (manifest generation + tsc -b + vite build, OXC minifier). Timings and what is deliberately not in the gate: `.cursor/brain/VERIFICATION.md`.
