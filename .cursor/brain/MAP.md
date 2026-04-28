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

- **Zustand** — global client state (user, session, progress, UI, presets, and related)
- **TanStack Query** — server data, caching, background refetch
- **Local** — component-only state via React local state

## Routing

| Path               | Page            | Notes                 |
| ------------------ | --------------- | --------------------- |
| `/`                | HomePage        | index route, not lazy |
| `/session/play`    | SessionPlayPage | lazy + WithSuspense   |
| `/session/summary` | SummaryPage     | lazy + WithSuspense   |
| `*`                | NotFoundPage    | lazy + WithSuspense   |
| `/dev-playground`  | DevPlayground   | **DEV only** — omitted in prod |

## i18n Flow

On startup, i18next initializes and loads the `common` and `errors` bundles plus lazy page namespaces. `RootProviders` blocks the tree until the app is i18n-ready, then `document.lang` is set. In dev, `useI18nReload` watches `public/locales/**` for HMR.

## Data / Questions

| Location | Role |
| -------- | ---- |
| `public/data/manifest.json` | Category list and per-category counts |
| `public/data/<slug>.json` | Question payloads per category (bilingual RU/EN) |
| `src/lib/data/schema.ts` | Zod schema; validated at build and in CI |
| `src/lib/i18n/localized.ts` | `useLocalized()` — picks en/ru by active language |
| `src/hooks/data/useCategoryDisplay.ts` | Resolves category display names via i18n |
| `src/hooks/data/` | Category loading helpers |

Client preferences: `src/lib/storage/` (localStorage abstraction).

## Analytics

| Location | Role |
| -------- | ---- |
| `src/hooks/analytics/useAnalytics.ts` | UI-layer hook for question interactions |
| `src/lib/analytics/events.ts` | Canonical event names and payload contracts |
| `src/lib/analytics/index.ts` | Public entry of the analytics module |

## Algorithm / Session

Adaptive selection and session orchestration live under `src/lib/algorithm/`; wired from session-related stores and session pages.

### Session lifecycle

| Trigger | Effect | Flash on `/` |
| --- | --- | --- |
| User clicks "End Session" on `/session/play` | `sessionStore.endSession()` stamps `endedAt` and wipes session data, then `navigate('/')` | `sessionEnded` |
| Direct hit on `/session/play` without `config` (and no recent `endedAt`) | `useSessionSetup` redirects to `/` | `noActiveSession` |
| Direct hit on `/session/summary` without questions | `useSummaryPage` redirects to `/` | `summaryUnavailable` |

Flash variants are surfaced via `<FlashBanner />` on `HomePage` (auto-dismiss 6s, dismissable, `role="status"`).

## FlashBanner

Single-place feedback for redirects from session routes. State is carried via React Router `location.state.flash` (`FlashKind`), cleared on mount with `navigate(pathname, { replace: true, state: null })` so a refresh does not re-show.

## CSS / Theming

Single file `src/index.css`: Tailwind v4 import, animation utilities (`tw-animate-css`), class-based dark mode (`@custom-variant dark`), design tokens in `@theme inline` mapping utilities to CSS variables, HSL tokens on `:root` and `.dark`. Brand color uses `--primary` on `:root`. New color tokens: add HSL in `:root`, then map in `@theme inline`.

## PWA

Authoritative note: `.cursor/brain/PWA.md` — update strategy (prompt), precache policy, manifest, iOS/Android meta, Firebase cache headers, intentional omissions (maskable icon policy, screenshot dimensions, `robots.txt`).

## CI / Supply chain

| Artifact                        | Role                                                                 |
| ------------------------------- | -------------------------------------------------------------------- |
| `.github/workflows/ci.yml`     | PR + push `master`: audit (moderate+), lint, format, type-check, data validation, unit + e2e tests |
| `.github/workflows/deploy.yml`  | Push `master`: lint, format, type-check, data validation, test, build, Firebase deploy |
| `.github/dependabot.yml`       | Weekly npm version PRs (limit 8 open)                                |
