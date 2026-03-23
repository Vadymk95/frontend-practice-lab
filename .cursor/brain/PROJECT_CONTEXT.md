# InterviewOS — Project Context

## Purpose

Personal mobile-first interview preparation SPA for frontend engineers. Daily habit tool (1-hour sessions) to combat cognitive atrophy from AI-assisted workflows. Covers trainee → principal/staff engineer depth across 17 topic categories. Adaptive algorithm tracks per-topic error rates and surfaces weak areas more frequently.

PRD: `_bmad-output/planning-artifacts/prd.md`

## Tech Stack

| Layer        | Choice                           | Version                   |
| ------------ | -------------------------------- | ------------------------- |
| UI           | React                            | 19                        |
| Language     | TypeScript                       | 5.9 strict                |
| Bundler      | Vite (rolldown-vite)             | 7                         |
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
    common/      # App-level: ErrorBoundary etc.
    layout/      # Header, Footer, Main
    ui/          # shadcn/ui components (Button, Input, ...)
  hocs/          # WithSuspense
  hooks/
    i18n/        # useI18nReload (dev HMR)
    <domain>/    # Domain hooks with tests alongside
  lib/
    api/         # Base fetch client + example
    i18n/        # i18next setup, constants, types
    queryClient  # TanStack Query client factory
    utils        # cn() helper (clsx + tailwind-merge)
  pages/
    HomePage/    # Entry page (no lazy)
    NotFoundPage/ # Lazy loaded (PageName.tsx + index.ts)
    DevPlayground/ # Dev sandbox (remove before prod)
  router/
    index.tsx    # createBrowserRouter assembly
    modules/     # Route modules: base.routes.tsx
    routes.ts    # Route name constants
  store/
    user/        # userStore.ts + userStore.test.ts
    utils/       # createSelectors.ts
  data/          # JSON question files (one per category)
  test/
    setup.ts     # Vitest setup
    test-utils   # Custom render with providers
```

## Key Patterns

### Tailwind v4 (IMPORTANT — no tailwind.config.ts)

- Config lives in `src/index.css` via `@theme inline {}`
- Dark mode via `@custom-variant dark (&:where(.dark, .dark *))`
- Animations via `tw-animate-css` (import in CSS, not a JS plugin)
- Custom animations defined as `@keyframes` + `--animate-*` in `@theme`

### Components: always presentational + hook

```
ComponentName/
  ComponentName.tsx    # UI only, imports hook
  useComponentName.ts  # All logic here
  ComponentName.test.tsx
```

### Stores: Zustand + createSelectors

```typescript
// Usage: useUserStore.use.username() — auto-selector
export const useUserStore = createSelectors(useUserStoreBase);
```

### Pages: lazy by default

```typescript
// PageName.tsx — component
// index.ts — lazy(() => import('./PageName'))
// Router uses WithSuspense HOC
```

### i18n

- Default language: **Russian**. Language toggle RU/EN persists via localStorage.
- Code snippets always in English regardless of active language
- `common` — always loaded (buttons, labels)
- `errors` — always loaded (API/validation errors)
- Feature namespaces — lazy loaded on demand

### Data Layer

- Questions stored in `src/data/<category>.json` — strict schema
- Schema validated at build time (CI)
- Storage service encapsulates all localStorage access — swappable for Firebase
- See `docs/content-guide.md` for question schema and contribution patterns

## Agent Rules

Engineering standards, react patterns, state management, testing, and other constraints:
**Read `.cursor/rules/` before any implementation task.**

Key rules files:
- `engineering-standards.mdc` — code quality, naming, structure
- `react-patterns.mdc` — component patterns, hooks
- `state-management.mdc` — Zustand usage
- `test-driven-development.mdc` — testing approach
- `performance.mdc` — performance constraints
- `routing.mdc` — React Router 7 patterns

## Dev Tooling

- `npm run dev` — dev server on :3000
- `npm run build` — tsc + vite build (OXC minifier)
- `npm run test` — vitest run
- `npm run lint` — eslint flat config
