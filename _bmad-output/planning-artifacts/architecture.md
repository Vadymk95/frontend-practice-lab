---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
lastStep: 8
status: 'complete'
completedAt: '2026-03-23'
adversarialReviewCompleted: '2026-03-23'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-22.md'
  - '.cursor/brain/PROJECT_CONTEXT.md'
workflowType: 'architecture'
project_name: 'InterviewOS'
user_name: 'Vadym'
date: '2026-03-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (51 FRs across 7 groups):**

| Group | Count | Architectural Impact |
|-------|-------|---------------------|
| Session Management | 14 | Session state lifecycle (configurator → load → active → post-session), preset storage |
| Question Answering | 9 | 4 question type renderers with distinct interaction models, unified abstraction |
| Progress & Adaptation | 11 | Per-question weight system, weighted sampling, localStorage persistence |
| Timer & Records | 3 | Session timer, per-config best-time records |
| Theming & i18n | 3 | Dark/light toggle (.dark class), RU/EN toggle, code snippets always EN |
| Content & Categories | 6 | 17 JSON files, strict schema, CI validation, zero-code category addition |
| App & Access | 5 | No auth, PWA (install + offline + update toast), Google Analytics |

**Non-Functional Requirements (15 NFRs):**

- **Performance:** FCP < 2s on 4G; UI interactions < 100ms; no blocking renders — app shell before data
- **Accessibility:** WCAG AA (contrast 4.5:1, tap targets ≥ 44×44px, focus-visible, keyboard nav)
- **Reliability:** Algorithm must not produce NaN / overflow / infinite loops; stale localStorage IDs silently ignored
- **Maintainability:** New category = drop one JSON file, zero code changes; storage layer swappable (localStorage → Firebase) without UI changes

**Scale & Complexity:**

- Primary domain: SPA, mobile-first, offline-capable, static hosting, no backend, no auth, no real-time
- Complexity level: **Medium**
- Main complexity drivers: adaptive algorithm + 4 question interaction models + PWA offline strategy + storage abstraction
- Estimated architectural components: ~12–15 distinct modules

### Technical Constraints & Dependencies

- **React 19 + Vite (rolldown)** — SPA, pure static output, no SSR, no API routes
- **Deploy target:** GitHub Pages or Firebase Hosting (static)
- **PWA:** `vite-plugin-pwa` — service worker, precache manifest, skipWaiting update flow
- **Storage v1:** localStorage via encapsulated `StorageService`; interface must be Firebase-swappable (NFR15)
- **Data:** 17 JSON files in `src/data/`, one per category, strict TypeScript-compatible schema
- **i18n:** `i18next` + lazy namespace loading; all UI strings via `t()`; code snippets hardcoded EN
- **Theming:** Tailwind v4 via `.dark` class (no `tailwind.config.ts` — config in `src/index.css`)
- **Browser support:** Last 2 major versions of Chrome, Safari, Firefox, Edge; iOS Safari + Chrome for Android primary mobile targets

### Cross-Cutting Concerns Identified

1. **Routing & code splitting** — Not all routes need lazy loading. Static/always-needed routes (HomePage, NotFoundPage shell) load eagerly. Feature routes (Session, Question, Summary) lazy-loaded via `lazy()` + `WithSuspense` HOC. `NotFoundPage` and `ErrorBoundary` are part of router setup — must be handled at router level.

2. **Error handling** — `ErrorBoundary` wraps the router. `NotFoundPage` is a dedicated route (`path="*"`). PWA offline degradation and JSON load failure need explicit error states (currently undefined in PRD — architectural decision required).

3. **UI / Logic separation** — Every component has a co-located `useComponentName.ts` hook that owns all logic. The `.tsx` file is presentation-only. This pattern is enforced across all feature components.

4. **Zustand store design** — Three distinct domains, each its own store: `sessionStore` (active session state), `progressStore` (adaptive weights + error rates, persisted), `uiStore` (theme, language). Zustand used with `createSelectors` for granular reactivity — components subscribe to only the slice they need, preventing over-renders.

5. **State management boundary** — Local component state (React `useState`/`useReducer`) for ephemeral UI (which option is hovered, animation state). Zustand for cross-component shared state. TanStack Query for async data fetching (JSON files). No mixing of concerns.

6. **Adaptive algorithm** — Pure function module (`src/lib/algorithm/`), zero side effects, all constants in a single exported config object. Fully unit-tested. Consumed by `progressStore` — algorithm itself has no store dependency.

7. **Analytics** — Google Analytics event dispatch abstracted behind a `useAnalytics` hook or `analytics.ts` service. Prevents direct GA calls scattered across components.

8. **Accessibility** — WCAG AA baseline via shadcn/ui defaults. No custom component overrides that break a11y. Focus management during question navigation (auto-focus on new question card).

9. **i18n namespace strategy** — `common` and `errors` always loaded. Feature namespaces (`session`, `question`, `summary`) lazy-loaded on route entry. Code snippets never passed through `t()`.

10. **CI schema validation** — JSON Schema (or `zod`) validates all 17 data files at build time. TypeScript types generated from or aligned with the schema. Malformed file = build failure.

---

## Starter Template / Project Scaffold

### Status

Project is already initialized with a custom scaffold — not a generic Vite/CRA template. All stack decisions are established. This document formalizes those decisions and layers architectural patterns on top.

### Confirmed Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| UI Framework | React | 19 |
| Language | TypeScript strict | 5.9 |
| Bundler | Vite (rolldown-vite) | 7 |
| Styling | Tailwind CSS (CSS-based config) | v4 |
| Components | shadcn/ui (new-york) | latest |
| Global State | Zustand + devtools | 5 |
| Server State | TanStack Query | 5 |
| Routing | React Router | 7 |
| Forms | react-hook-form + zod | 7 / 4 |
| i18n | i18next + react-i18next | 25 / 16 |
| Testing | Vitest + Testing Library | 4 |
| Linting | ESLint flat config | 9 |
| Formatting | Prettier | 3 |
| Git hooks | Husky + commitlint + lint-staged | — |
| PWA | vite-plugin-pwa | latest |

### Tailwind v4 Configuration Rule

**No `tailwind.config.ts`**. Theme lives in `src/index.css`:

```css
@theme inline { /* custom tokens */ }
@custom-variant dark (&:where(.dark, .dark *));
```

Animations via `tw-animate-css` (imported in CSS, not a JS plugin). Custom animations as `@keyframes` + `--animate-*` in `@theme`.

### Project Rules Compliance

All development MUST follow the rules defined in `.cursor/rules/`:

- `engineering-standards.mdc` — code quality, naming, structure
- `react-patterns.mdc` — component patterns, hooks
- `state-management.mdc` — Zustand usage
- `test-driven-development.mdc` — testing approach
- `performance.mdc` — performance constraints
- `routing.mdc` — React Router 7 patterns

These rules take precedence over generic best practices. Any AI agent implementing stories must read `.cursor/rules/` before writing code.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**
- JSON question schema (TypeScript types + zod validation)
- Routing structure with lazy/eager split
- Zustand store boundaries and StorageService interface
- Error states for JSON fetch failure, empty results, offline

**Important (shape architecture):**
- Analytics event taxonomy
- Firebase Hosting CI/CD setup (Firebase SDK deferred to v2)
- JSON file location (`public/data/`)

**Deferred (post-MVP):**
- Firebase SDK (Firestore, Auth) — StorageService abstraction enables zero-UI-change migration
- Firebase Authentication
- Admin route (`/admin`)

---

### Data Architecture

#### Question Schema

Single source of truth — zod schemas in `src/lib/data/schema.ts` generate both runtime validators and TypeScript types.

```ts
// Base
interface BaseQuestion {
  id: string            // stable slug, e.g. "js-closure-001"
  type: QuestionType
  category: string      // matches JSON filename, e.g. "javascript"
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  question: string
  explanation: string
}

// single-choice: tap → instant reveal, no button
interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single-choice'
  options: string[]
  correct: number       // index into options
}

// multi-choice: select many → Check button
interface MultiChoiceQuestion extends BaseQuestion {
  type: 'multi-choice'
  options: string[]
  correct: number[]     // indices
}

// bug-finding: code snippet → options or short text → Submit → self-assess
interface BugFindingQuestion extends BaseQuestion {
  type: 'bug-finding'
  code: string
  options?: string[]
  correct: string
  referenceAnswer: string
}

// code-completion: __BLANK__ placeholders → text input → Submit
interface CodeCompletionQuestion extends BaseQuestion {
  type: 'code-completion'
  code: string          // contains __BLANK__ marker(s)
  blanks: string[]      // correct values; validated case-insensitive, trimmed
  referenceAnswer: string
}

type Question = SingleChoiceQuestion | MultiChoiceQuestion | BugFindingQuestion | CodeCompletionQuestion
```

#### JSON File Location

`public/data/<category>.json` — served as static assets. PWA service worker caches by URL. TanStack Query fetches via `fetch()`. New category = drop file, zero code changes (FR24).

#### Data Loading Strategy

TanStack Query manages fetch lifecycle per selected categories. Parallel fetches per category. Loader shown during fetch (NFR4). Error state on fetch failure.

#### CI Schema Validation

```bash
npm run validate:data   # runs src/scripts/validate-data.ts
```

Script imports zod schemas, parses all `public/data/*.json` files. Fails with exit code 1 on schema violation. GitHub Actions runs this on every push — malformed content blocks deployment (NFR14).

---

### Authentication & Security

**No authentication in v1.** Zero-auth read-only access (FR27). Content mutation gated by repo access only. Admin route deferred.

---

### Frontend Architecture

#### Routing Structure

```
/                    → HomePage          [eager]   No WithSuspense
/session             → SessionConfigPage [lazy]    WithSuspense
/session/play        → QuestionPage      [lazy]    WithSuspense
/session/summary     → SummaryPage       [lazy]    WithSuspense
*                    → NotFoundPage      [eager]   No WithSuspense
```

`ErrorBoundary` wraps the entire router at root level. `NotFoundPage` is a dedicated `path="*"` route — always loaded, no lazy needed.

**Rule:** Only feature routes (behind user action) are lazy. Shell routes (home, 404, error) are eager — they must render without any JS chunk delay.

#### UI / Logic Separation

Every feature component follows this pattern — no exceptions:

```
ComponentName/
  ComponentName.tsx      # JSX only — imports hook, renders output
  useComponentName.ts    # ALL logic — state, handlers, selectors, side effects
  ComponentName.test.tsx # Tests target the hook, not the rendered output
  index.ts               # re-export
```

No business logic in `.tsx` files. No direct store calls from `.tsx` — always via the hook.

#### Zustand Store Boundaries

Three stores, strict domain separation:

| Store | Path | Persisted | Owns |
|-------|------|-----------|------|
| `sessionStore` | `src/store/session/` | ❌ | Active session: question list, current index, answers, skip list, mode, config, timer |
| `progressStore` | `src/store/progress/` | ✅ localStorage | Per-question weights, per-category error rates, streak, session records |
| `uiStore` | `src/store/ui/` | ✅ localStorage | theme ('dark'/'light'), language ('ru'/'en') |

All stores use `createSelectors`. Components subscribe to single slices — no over-renders.

**Rule:** Stores never call each other directly. `sessionStore` reads question list (derived from data fetch + progressStore weights) via a coordinator in the hook layer (`useSessionSetup.ts`).

#### StorageService Interface

```ts
interface StorageService {
  // Progress
  getWeights(): Record<string, number>
  setWeights(weights: Record<string, number>): void
  getErrorRates(): Record<string, number>
  setErrorRates(rates: Record<string, number>): void
  getStreak(): StreakData
  setStreak(data: StreakData): void
  getRecords(): Record<string, number>
  setRecord(key: string, ms: number): void
  // UI
  getTheme(): 'dark' | 'light'
  setTheme(t: 'dark' | 'light'): void
  getLanguage(): 'ru' | 'en'
  setLanguage(l: 'ru' | 'en'): void
  // Presets
  getPresets(): SessionPreset[]
  savePreset(p: SessionPreset): void
  deletePreset(id: string): void
}
```

`LocalStorageService` implements this interface in v1. Firebase implementation drops in for v2 — zero UI or store changes required (NFR15).

#### Error States

| Scenario | UX |
|----------|----|
| JSON fetch failure | Full-screen `ErrorState` component: message + Retry button |
| 0 questions match filters | Inline empty state in SessionConfig: "No questions match. Adjust filters." |
| Offline, no cached data | Same `ErrorState` with offline message |
| Stale localStorage question IDs | Silently ignored — no UI (NFR12) |
| Runtime error (unhandled) | `ErrorBoundary` catches → fallback UI with reload option |

#### Adaptive Algorithm

Pure function module — `src/lib/algorithm/`. Zero side effects, no store imports.

```ts
// src/lib/algorithm/config.ts
export const ALGORITHM_CONFIG = {
  HIGH_ERROR_THRESHOLD: 0.40,
  LOW_ERROR_THRESHOLD: 0.15,
  HIGH_ERROR_MULTIPLIER: 2.0,
  LOW_ERROR_MULTIPLIER: 0.5,
  MAX_WEIGHT: 10,
  MIN_WEIGHT: 0.5,
  DEFAULT_WEIGHT: 1.0,
} as const

// src/lib/algorithm/index.ts
export function calculateWeight(errorRate: number, currentWeight: number): number
export function sampleWeighted(questions: Question[], weights: Record<string, number>, count: number): Question[]
export function updateErrorRate(previous: number, correct: boolean): number
```

All algorithm logic covered by unit tests. Constants changeable in one place.

---

### Analytics Events

Analytics abstracted behind `src/lib/analytics/index.ts`. No direct GA calls in components.

```ts
// Events taxonomy
session_start         { categories: string[], difficulty: string, mode: string, count: number }
question_answered     { category: string, difficulty: string, type: QuestionType, correct: boolean, timeMs: number }
session_complete      { score: number, total: number, durationMs: number, weakCategories: string[] }
session_abandoned     { answered: number, total: number }
repeat_mistakes_start { count: number }
preset_saved          {}
preset_loaded         {}
language_changed      { to: 'ru' | 'en' }
theme_changed         { to: 'dark' | 'light' }
pwa_install_prompt    {}
pwa_update_applied    {}
```

---

### Infrastructure & Deployment

#### Hosting: Firebase Hosting

**v1: Firebase Hosting** (static SPA deployment). Firebase SDK (Firestore/Auth) deferred to v2.

Agent sets up all configuration. User action required: create project at console.firebase.google.com, then run `firebase use --add`.

**`firebase.json`:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "**/*.@(js|css)", "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }] },
      { "source": "/data/**", "headers": [{ "key": "Cache-Control", "value": "max-age=86400" }] }
    ]
  }
}
```

#### CI/CD: GitHub Actions

Two workflows:

1. **`ci.yml`** — on every push/PR: `lint` → `tsc --noEmit` → `validate:data` → `test`
2. **`deploy.yml`** — on push to `main`: above checks → `build` → `firebase deploy`

Agent generates both workflow files. User adds `FIREBASE_TOKEN` secret to GitHub repo settings.

#### Decision Impact Analysis

**Implementation sequence:**
1. `src/lib/data/schema.ts` — zod schemas + TypeScript types (all other code depends on this)
2. `src/lib/storage/` — StorageService interface + LocalStorageService
3. `src/lib/algorithm/` — pure functions + unit tests
4. `src/store/` — three Zustand stores consuming StorageService
5. Routing scaffold — router with ErrorBoundary + lazy routes
6. Data fetch layer — TanStack Query hooks per category
7. Feature components — Session → Question → Summary
8. PWA + Analytics
9. Firebase Hosting + CI/CD

**Cross-component dependencies:**
- Algorithm depends on: schema types only
- Stores depend on: StorageService + algorithm
- Pages depend on: stores (via hooks) + TanStack Query (via hooks)
- CI depends on: zod schemas (validate:data script)

---

## Project Structure & Boundaries

### Architecture Style

**Layered Architecture with feature grouping** — not FSD. Layers: `lib → store → hooks → components → pages → router`. Inside `components/`, grouped by domain (`common`, `layout`, `ui`, `features`). Appropriate for a solo project with 3 pages — simple, scalable, agent-friendly.

### Complete Project Tree

```
frontend-practice-lab/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # lint → tsc → validate:data → test
│       └── deploy.yml                      # ci + build + firebase deploy (main only)
├── .firebaserc                             # { "projects": { "default": "<project-id>" } }
├── firebase.json                           # hosting config, SPA rewrite, cache headers
├── docs/
│   └── content-guide.md                   # Question schema, contribution patterns, examples
├── public/
│   ├── data/                               # 17 JSON files — static assets, PWA-cached by SW
│   │   ├── html.json
│   │   ├── css.json
│   │   ├── browser-internals.json
│   │   ├── javascript.json
│   │   ├── typescript.json
│   │   ├── react.json
│   │   ├── nextjs.json
│   │   ├── architecture-patterns.json
│   │   ├── build-tools.json
│   │   ├── performance.json
│   │   ├── security.json
│   │   ├── api-backend-for-frontend.json
│   │   ├── feature-flags.json
│   │   ├── git.json
│   │   ├── testing.json
│   │   ├── team-lead-processes.json
│   │   └── best-practices.json
│   └── icons/                              # PWA icons
├── src/
│   ├── index.css                           # Tailwind v4 @theme + @custom-variant dark
│   ├── main.tsx                            # React root, i18n init, QueryClient provider
│   ├── vite-env.d.ts
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── error-boundary/
│   │   │   │   ├── ErrorBoundary.tsx       # catches unhandled runtime errors
│   │   │   │   └── index.ts
│   │   │   └── error-state/               # network/fetch error UI + retry
│   │   │       ├── ErrorState.tsx
│   │   │       ├── useErrorState.ts
│   │   │       └── index.ts
│   │   ├── layout/
│   │   │   ├── app-header/
│   │   │   │   ├── AppHeader.tsx           # logo + theme toggle + language toggle
│   │   │   │   ├── useAppHeader.ts
│   │   │   │   └── index.ts
│   │   │   └── app-shell/
│   │   │       ├── AppShell.tsx
│   │   │       └── index.ts
│   │   ├── ui/                             # shadcn/ui primitives (Button, Input, Badge…)
│   │   └── features/                       # feature-specific composite components
│   │       ├── question-card/              # orchestrator — delegates to sub-type
│   │       │   ├── QuestionCard.tsx
│   │       │   ├── useQuestionCard.ts
│   │       │   ├── QuestionCard.test.tsx
│   │       │   ├── index.ts
│   │       │   └── types/
│   │       │       ├── single-choice/
│   │       │       │   ├── SingleChoiceQuestion.tsx
│   │       │       │   ├── useSingleChoiceQuestion.ts
│   │       │       │   └── index.ts
│   │       │       ├── multi-choice/
│   │       │       │   ├── MultiChoiceQuestion.tsx
│   │       │       │   ├── useMultiChoiceQuestion.ts
│   │       │       │   └── index.ts
│   │       │       ├── bug-finding/
│   │       │       │   ├── BugFindingQuestion.tsx
│   │       │       │   ├── useBugFindingQuestion.ts
│   │       │       │   └── index.ts
│   │       │       └── code-completion/
│   │       │           ├── CodeCompletionQuestion.tsx
│   │       │           ├── useCodeCompletionQuestion.ts
│   │       │           └── index.ts
│   │       ├── session-config/
│   │       │   ├── SessionConfig.tsx
│   │       │   ├── useSessionConfig.ts
│   │       │   ├── SessionConfig.test.tsx
│   │       │   └── index.ts
│   │       └── post-session/
│   │           ├── PostSession.tsx
│   │           ├── usePostSession.ts
│   │           ├── PostSession.test.tsx
│   │           └── index.ts
│   │
│   ├── hocs/
│   │   └── with-suspense/
│   │       ├── WithSuspense.tsx            # Suspense wrapper + fallback spinner
│   │       └── index.ts
│   │
│   ├── hooks/                              # SHARED hooks — used in 2+ places
│   │   ├── data/
│   │   │   ├── useCategories.ts            # fetch all categories — HomePage + SessionConfig
│   │   │   └── useCategoryQuestions.ts    # fetch questions by category — SessionConfig + QuestionPage
│   │   ├── progress/
│   │   │   ├── useProgress.ts             # error rates + weights — HomePage widget + SummaryPage
│   │   │   └── useStreak.ts               # streak data — HomePage + SummaryPage
│   │   ├── session/
│   │   │   ├── useSessionSetup.ts         # coordinates data + weights → sessionStore
│   │   │   └── useSessionPresets.ts       # CRUD presets — SessionConfig + HomePage
│   │   ├── ui/
│   │   │   ├── useTheme.ts                # get/set theme — AppHeader + anywhere
│   │   │   └── useLanguage.ts             # get/set language — AppHeader + i18n
│   │   └── analytics/
│   │       └── useAnalytics.ts            # track() wrapper — any component
│   │
│   ├── lib/
│   │   ├── algorithm/
│   │   │   ├── config.ts                  # ALGORITHM_CONFIG — all constants
│   │   │   ├── index.ts                   # calculateWeight, sampleWeighted, updateErrorRate
│   │   │   └── algorithm.test.ts          # full unit test coverage required
│   │   ├── analytics/
│   │   │   ├── events.ts                  # event name constants + payload types
│   │   │   └── index.ts                   # track() wrapping GA
│   │   ├── data/
│   │   │   ├── schema.ts                  # zod schemas → TypeScript types (Question union)
│   │   │   ├── types.ts                   # re-exports of inferred types
│   │   │   └── categories.ts              # CATEGORIES constant (17 entries, matches filenames)
│   │   ├── i18n/
│   │   │   ├── config.ts                  # i18next init
│   │   │   ├── constants.ts               # SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE
│   │   │   └── types.ts
│   │   ├── storage/
│   │   │   ├── types.ts                   # StorageService interface + domain types
│   │   │   ├── local-storage.service.ts   # LocalStorageService implements StorageService
│   │   │   ├── local-storage.service.test.ts
│   │   │   └── index.ts                   # exports service singleton
│   │   ├── query-client/
│   │   │   └── index.ts                   # TanStack Query client factory
│   │   └── utils/
│   │       └── index.ts                   # cn() (clsx + tailwind-merge)
│   │
│   ├── pages/
│   │   ├── HomePage/                       # [eager] — no lazy, no WithSuspense
│   │   │   ├── HomePage.tsx
│   │   │   ├── useHomePage.ts
│   │   │   └── index.ts                   # direct named export
│   │   ├── SessionConfigPage/             # [lazy]
│   │   │   ├── SessionConfigPage.tsx
│   │   │   ├── useSessionConfigPage.ts
│   │   │   └── index.ts                   # export default lazy(...)
│   │   ├── QuestionPage/                  # [lazy]
│   │   │   ├── QuestionPage.tsx
│   │   │   ├── useQuestionPage.ts
│   │   │   └── index.ts
│   │   ├── SummaryPage/                   # [lazy]
│   │   │   ├── SummaryPage.tsx
│   │   │   ├── useSummaryPage.ts
│   │   │   └── index.ts
│   │   └── NotFoundPage/                  # [eager] — always loaded, path="*"
│   │       ├── NotFoundPage.tsx
│   │       └── index.ts
│   │
│   ├── router/
│   │   ├── index.tsx                      # createBrowserRouter + ErrorBoundary root
│   │   ├── routes.ts                      # ROUTES constant: HOME, SESSION, PLAY, SUMMARY
│   │   └── modules/
│   │       └── app.routes.tsx             # route definitions: lazy + WithSuspense
│   │
│   ├── scripts/
│   │   └── validate-data.ts              # CI: validates all public/data/*.json via zod
│   │
│   ├── store/
│   │   ├── session/
│   │   │   ├── index.ts                  # sessionStore — not persisted
│   │   │   └── session.test.ts
│   │   ├── progress/
│   │   │   ├── index.ts                  # progressStore — persisted via StorageService
│   │   │   └── progress.test.ts
│   │   ├── ui/
│   │   │   ├── index.ts                  # uiStore: theme + language — persisted
│   │   │   └── ui.test.ts
│   │   └── utils/
│   │       └── createSelectors.ts
│   │
│   └── test/
│       ├── setup.ts
│       └── test-utils/
│           └── index.tsx                 # custom render with all providers
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc
├── prettier.config.js
└── index.html
```

### Shared Hooks Rule

**Hook placement decision:**
- Used in **1 place only** → `ComponentName/useComponentName.ts` (co-located)
- Used in **2+ places** → `src/hooks/<domain>/useXxx.ts` (shared)

This rule is enforced at review. An agent must not duplicate logic across component hooks — extract to `src/hooks/` instead.

### Data Flow

```
public/data/*.json
  → TanStack Query (fetch + cache, staleTime: Infinity)
    → useSessionSetup (shared hook: data + progressStore weights → sessionStore)
      → sessionStore (active session)
        → QuestionPage via useQuestionPage
          → on answer: progressStore.recordAnswer()
            → StorageService.setWeights() / setErrorRates()
```

### Architectural Boundaries (Import Rules)

| Module | Can import from | Cannot import from |
|--------|----------------|-------------------|
| `lib/algorithm/` | `lib/data/types` only | stores, components, pages |
| `lib/storage/` | `lib/data/types` only | stores, components |
| `store/*` | `lib/*` only | other stores, components, pages |
| `hooks/*` (shared) | `store/*`, `lib/*` | components, pages |
| `components/*` | `hooks/*`, `lib/*`, `components/ui/*` | stores directly, pages |
| `pages/*` | `components/*`, `hooks/*`, `lib/*` | other pages |

### FR → Directory Mapping

| FR Group | Primary Location |
|----------|-----------------|
| Session Management | `src/pages/SessionConfigPage/`, `src/components/features/session-config/`, `src/store/session/` |
| Question Answering | `src/pages/QuestionPage/`, `src/components/features/question-card/` |
| Progress & Adaptation | `src/store/progress/`, `src/lib/algorithm/` |
| Timer & Records | `src/store/session/` (timer), `src/store/progress/` (records) |
| Theming & i18n | `src/store/ui/`, `src/lib/i18n/`, `src/hooks/ui/` |
| Content & Categories | `public/data/`, `src/lib/data/`, `src/scripts/`, `docs/` |
| App & Access | `src/router/`, `src/hocs/`, `vite.config.ts`, `src/lib/analytics/` |

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Files & directories:** kebab-case for folders, PascalCase for component files:
```
src/components/question-card/
  QuestionCard.tsx
  useQuestionCard.ts
  QuestionCard.test.tsx
  index.ts
```

**Hooks:** `use` + PascalCase: `useSessionSetup`, `useQuestionCard`, `useProgressStore`

**Stores:** `useXxxStoreBase` (raw) → `useXxxStore` (with createSelectors). Files in `src/store/<domain>/index.ts`.

**Constants:** UPPER_SNAKE_CASE in `src/lib/<domain>/constants.ts`.

**Question IDs:** stable slug, e.g. `"js-closure-001"`, `"react-use-effect-deps-003"`. Never UUID. Changing an ID = user loses progress for that question.

---

### UI / Logic Separation (React best practice, March 2026)

**Ephemeral UI state stays in the component** — no hook needed for local toggle/open/close:
```tsx
// ✅ In .tsx — local, ephemeral, not reused elsewhere
const [isOpen, setIsOpen] = useState(false)
const [tooltipVisible, setTooltipVisible] = useState(false)
```
Examples: accordion open/close, dropdown state, tooltip visibility, animation trigger.
Rule: if the state is only ever used in one component and has no business meaning — keep it local.

**Business logic goes in `useComponentName.ts`:**
- Zustand store reads (via createSelectors)
- TanStack Query calls
- Answer validation, adaptive algorithm calls
- Computed values from store/data
- Side effects: analytics events, storage writes
- Navigation logic (useNavigate)

```tsx
// QuestionCard.tsx ✅
export function QuestionCard() {
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false) // local UI
  const { question, onAnswer, isAnswered } = useQuestionCard()              // business logic
  return <div>...</div>
}
```

```tsx
// QuestionCard.tsx ❌ — business logic leaked into component
export function QuestionCard() {
  const question = useSessionStore.use.currentQuestion()
  const dispatch = useSessionStore.use.recordAnswer()
  // ...
}
```

---

### State Management Patterns

**Granular store subscription — always:**
```ts
// ✅ — re-renders only when currentIndex changes
const currentIndex = useSessionStore.use.currentIndex()

// ❌ — re-renders on any store change
const { currentIndex } = useSessionStore()
```

**Stores never call each other.** Cross-store coordination happens in hooks:
```ts
// useSessionSetup.ts ✅
const weights = useProgressStore.use.weights()   // read from progressStore
const questions = useQuestionData()               // from TanStack Query
const sampled = sampleWeighted(questions, weights, config.count) // algorithm
useSessionStore.use.setQuestions()(sampled)       // write to sessionStore
```

**TanStack Query for all async data — never useEffect + fetch:**
```ts
// ✅
const { data, isLoading, error } = useQuery({
  queryKey: ['category', categoryId],
  queryFn: () => fetch(`/data/${categoryId}.json`).then(r => r.json()),
  staleTime: Infinity, // JSON data doesn't change during session
})

// ❌
useEffect(() => { fetch(...).then(setData) }, [])
```

---

### Question Type Handling

**Exhaustive switch with `satisfies never`** — TypeScript enforces coverage at compile time:
```tsx
// QuestionRenderer.tsx
function QuestionRenderer({ question }: { question: Question }) {
  switch (question.type) {
    case 'single-choice':   return <SingleChoiceQuestion q={question} />
    case 'multi-choice':    return <MultiChoiceQuestion q={question} />
    case 'bug-finding':     return <BugFindingQuestion q={question} />
    case 'code-completion': return <CodeCompletionQuestion q={question} />
    default: {
      const _exhaustive: never = question
      return null
    }
  }
}
```
Adding a new question type without updating this switch = TypeScript compile error.

---

### i18n Patterns

All user-visible strings via `t()` — no exceptions:
```tsx
// ✅
<Button>{t('session.start_button')}</Button>

// ❌
<Button>Start Session</Button>
```

Code snippets and technical identifiers (`useState`, `Promise`, CSS properties) are **never** passed through `t()` — always raw strings, always English.

Namespace loading: `common` + `errors` always loaded. Feature namespaces (`session`, `question`, `summary`) loaded on route entry via `useSuspenseQuery` or i18next lazy backend.

---

### Error Handling Patterns

Three levels — never mix:

1. **`ErrorBoundary`** — unhandled runtime JS errors only. Wraps router root. Shows reload button.
2. **TanStack Query `error` state** — network/fetch errors. Component renders `<ErrorState />` with retry.
3. **react-hook-form + zod** — form validation errors. Inline field-level messages.

```ts
// ✅ Structured error logging
console.error('[progressStore] Failed to parse weights from storage:', { error, raw })

// ❌
console.log(error)
console.error(error)
```

No `try/catch` in components or hooks for data fetching — TanStack Query handles it.

---

### Structure Patterns

**Tests co-located, never in `__tests__/`:**
```
useAdaptiveAlgorithm.ts
useAdaptiveAlgorithm.test.ts   ✅
__tests__/algorithm.test.ts    ❌
```

**Index re-exports for all public modules:**
```ts
import { QuestionCard } from '@/components/question-card'     ✅
import { QuestionCard } from '@/components/question-card/QuestionCard'  ❌
```

**`@/` alias only — no relative `../../`:**
```ts
import { StorageService } from '@/lib/storage'    ✅
import { StorageService } from '../../../lib/storage'  ❌
```

---

### Enforcement

**Every agent implementing a story MUST:**
1. Read `.cursor/rules/` (especially `react-patterns.mdc`, `state-management.mdc`)
2. Read this Architecture document
3. Read `docs/content-guide.md` when touching data files
4. Run `npm run lint && npx tsc --noEmit` before considering the story done

**Forbidden (will fail lint or review):**
- Business logic in `.tsx` files
- Direct `localStorage` calls outside `StorageService`
- `useEffect` for data fetching
- Hardcoded user-visible strings without `t()`
- Relative imports with `../../`
- `console.log` in any file (use structured `console.error` with context or remove)
- `any` type in TypeScript

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:** All technology choices are mutually compatible. React 19 + Vite 7 + Tailwind v4 + shadcn/ui + Zustand 5 + TanStack Query 5 + React Router 7 — verified compatible combination. No version conflicts.

**Pattern consistency:** UI/Logic separation → createSelectors → shared hooks rule → exhaustive question-type switch form a coherent, non-contradictory system.

**Structure alignment:** `public/data/` placement enables PWA caching by URL. `lib/algorithm/` isolation enforced by import rules. StorageService boundary prevents direct localStorage access from components.

### Requirements Coverage Validation

**Functional Requirements: 51/51 covered** after gap resolution.

**Non-Functional Requirements: 15/15 covered:**
- NFR1–4 (Performance): lazy routes + PWA caching + TanStack Query non-blocking fetch
- NFR5–8 (Accessibility): shadcn/ui defaults + documented tap target / contrast rules
- NFR9–12 (Reliability): ALGORITHM_CONFIG + pure functions + unit tests + stale ID silent ignore
- NFR13–15 (Maintainability): import.meta.glob auto-discovery + StorageService interface + CI validation

### Gaps Identified & Resolved

**Gap 1 (Medium) — FR15: Syntax highlighting library — RESOLVED**

Selected: **Shiki** — zero runtime bundle (static generation), VS Code-quality highlighting, native Vite integration.

```ts
// Usage in BugFindingQuestion / CodeCompletionQuestion
import { codeToHtml } from 'shiki'
const highlighted = await codeToHtml(code, { lang: 'typescript', theme: 'github-dark' })
```

Add to `package.json`: `shiki` (latest).

**Gap 2 (Medium) — FR24: Zero-code category addition — RESOLVED**

`CATEGORIES` uses `import.meta.glob` for auto-discovery at build time:

```ts
// src/lib/data/categories.ts
const modules = import.meta.glob('/public/data/*.json', { eager: false })
export const CATEGORIES = Object.keys(modules)
  .map(path => path.replace('/public/data/', '').replace('.json', ''))
  .sort()
```

Drop a new JSON file → category appears automatically. No code changes required (FR24 ✅).

**Gap 3 (Minor) — PWA update toast — RESOLVED**

Added `pwa-update-toast/` to `components/common/`:

```
src/components/common/
  error-boundary/
  error-state/
  pwa-update-toast/           # ← added
    PwaUpdateToast.tsx         # listens to SW update event, shows toast
    usePwaUpdateToast.ts       # useRegisterSW from vite-plugin-pwa
    index.ts
```

Mounted in `AppShell.tsx` — always present, non-blocking.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 51 FRs analyzed and mapped to architectural components
- [x] 15 NFRs addressed with specific implementation approaches
- [x] Technical constraints identified (SPA, static hosting, no SSR)
- [x] Cross-cutting concerns mapped (state, i18n, theming, analytics, PWA, a11y)

**✅ Architectural Decisions**
- [x] Full tech stack with versions documented
- [x] Routing structure with lazy/eager split defined
- [x] Zustand store boundaries (3 stores) specified
- [x] StorageService interface for Firebase-ready abstraction
- [x] Adaptive algorithm as pure isolated module
- [x] Analytics event taxonomy enumerated
- [x] Firebase Hosting + CI/CD approach decided
- [x] Syntax highlighting library selected (Shiki)
- [x] Category auto-discovery via import.meta.glob

**✅ Implementation Patterns**
- [x] UI/Logic separation rule with ephemeral-vs-business distinction
- [x] Shared hooks rule (1 place = co-locate, 2+ = src/hooks/)
- [x] Granular Zustand subscription pattern
- [x] Exhaustive switch with `satisfies never` for question types
- [x] TanStack Query for all async — no useEffect+fetch
- [x] Three-level error handling (ErrorBoundary / TanStack / react-hook-form)
- [x] i18n: all strings via t(), code snippets always raw English
- [x] Forbidden patterns enumerated

**✅ Project Structure**
- [x] Complete directory tree with 60+ specific files
- [x] Layered Architecture with feature grouping (not FSD)
- [x] Import boundary rules table defined
- [x] FR-to-directory mapping complete
- [x] Shared hooks directory with domain subfolders

### Architecture Readiness Assessment

**Overall Status: ✅ READY FOR IMPLEMENTATION**

**Confidence Level: HIGH**

**Key strengths:**
- StorageService abstraction enables Firebase migration with zero UI changes
- Pure algorithm module — fully testable, zero coupling
- import.meta.glob auto-discovery — truly zero-code category addition
- Exhaustive TypeScript switch — new question types can't be forgotten
- Shiki static highlighting — zero runtime cost
- Clear shared hooks rule prevents logic duplication across agents

**Deferred to v2 (by design):**
- Firebase SDK (Firestore, Auth)
- Code Ordering mode (dnd-kit)
- Monaco/CodeMirror live coding editor
- Progress dashboard charts
- Algorithms category

### Implementation Handoff

**Every AI agent implementing a story must read:**
1. `.cursor/rules/` — engineering standards and React patterns
2. This document (`_bmad-output/planning-artifacts/architecture.md`) — all decisions
3. `docs/content-guide.md` — if touching question data

**Implementation sequence (dependency order):**
1. `src/lib/data/schema.ts` — zod schemas + types (everything depends on this)
2. `src/lib/storage/` — StorageService interface + LocalStorageService
3. `src/lib/algorithm/` — pure functions + unit tests
4. `src/store/` — session, progress, ui stores
5. `src/router/` — routing scaffold with ErrorBoundary + lazy routes
6. `src/hooks/data/` — TanStack Query hooks for JSON fetch
7. `src/components/features/` — feature components (Session → Question → Summary)
8. `src/lib/analytics/` + PWA config
9. Firebase Hosting + GitHub Actions CI/CD

---

## Adversarial Review — Resolved Decisions

*Date: 2026-03-23. 12 issues identified and resolved.*

### #1 — Session Resume (Mid-session loss on mobile)

**Problem:** iOS Safari unloads tabs frequently. SessionStore is not persisted → user loses progress mid-session.

**Decision:** Session snapshot persisted to localStorage on every answer.

```ts
// STORAGE_KEYS.SNAPSHOT = 'ios:v1:session:snapshot'
// progressStore.recordAnswer() → StorageService.saveSessionSnapshot(sessionStore.getState())
// On app init: if snapshot exists → show "Resume session?" dialog
```

`sessionStore` itself remains non-persisted (clean on app open). Snapshot is written by `progressStore` as a side effect of recording an answer. On init, `useSessionSetup` checks for snapshot and offers resume. Snapshot is deleted on session complete or when user starts a new session.

---

### #2 — Shiki Async vs < 100ms (NFR3)

**Problem:** `codeToHtml()` is async — blocks initial render of question cards with code.

**Decision:** Progressive enhancement pattern.

```tsx
// 1. Render immediately as plain <pre><code className="font-mono"> — 0ms, readable
// 2. useEffect → codeToHtml() → replace innerHTML with highlighted version (~50-150ms)
// User sees readable code instantly; highlight appears without layout shift
```

Use `shiki/bundle/web` (pre-bundled common languages, smaller). PWA caches Shiki WASM after first load — subsequent visits highlight near-instantly. NFR3 is satisfied: first render is not blocked.

---

### #3 — StorageService Testability

**Problem:** Singleton export makes isolated testing impossible — tests share real localStorage.

**Decision:** Factory function + default singleton export.

```ts
// src/lib/storage/local-storage.service.ts
export function createLocalStorageService(
  storage: Storage = globalThis.localStorage
): StorageService {
  return {
    getWeights: () => JSON.parse(storage.getItem(STORAGE_KEYS.WEIGHTS) ?? '{}'),
    setWeights: (w) => storage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(w)),
    // ... all other methods
  }
}

// src/lib/storage/index.ts
export const storageService = createLocalStorageService() // app singleton
export { createLocalStorageService }                      // for tests
```

Tests: `const svc = createLocalStorageService(new MemoryStorage())` — full isolation, no shared state between tests.

---

### #4 — localStorage Key Namespace

**Problem:** No defined key structure → agent conflicts, domain collisions, migration impossible.

**Decision:** Colon-separated namespace with version prefix. All keys defined in one constant.

```ts
// src/lib/storage/keys.ts
export const STORAGE_KEYS = {
  WEIGHTS:     'ios:v1:progress:weights',
  ERROR_RATES: 'ios:v1:progress:error-rates',
  STREAK:      'ios:v1:progress:streak',
  RECORDS:     'ios:v1:progress:records',
  PRESETS:     'ios:v1:session:presets',
  SNAPSHOT:    'ios:v1:session:snapshot',
  THEME:       'ios:v1:ui:theme',
  LANGUAGE:    'ios:v1:ui:language',
} as const
```

`v1` enables schema migrations: bump to `v2` + write migration function when storage shape changes. Old keys don't conflict. No agent may hardcode storage key strings — always use `STORAGE_KEYS`.

---

### #5 — TanStack Query Cache Invalidation on SW Update

**Problem:** After deploy, TanStack Query in-memory cache serves stale data until tab is fully closed.

**Decision:** SW `controllerchange` event → invalidate all queries before reload.

```ts
// main.tsx — registered once at app init
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  queryClient.invalidateQueries()
  // location.reload() is triggered by PwaUpdateToast after skipWaiting
})
```

Flow: user accepts update toast → `updateServiceWorker(true)` → new SW activates → `controllerchange` fires → cache cleared → `location.reload()` → fresh data. Additionally: change `staleTime` from `Infinity` to `86_400_000` (24h) — reasonable for rarely-changing JSON data, allows background refresh on long sessions.

---

### #6 — import.meta.glob: Honest Formulation

**Decision:** Update documentation language. "Zero code changes — a new build and deploy is required." The CI/CD pipeline handles the build automatically on push, making the workflow: add JSON file → commit → push → auto-deploy → category available. This is genuinely low-friction, just not magical.

---

### #7 — useSessionSetup: Imperative Trigger

**Problem:** Hook trigger was undefined — risk of expensive sampling running on every SessionConfigPage mount.

**Decision:** Hook exposes an imperative `startSession()` action, not a mount side effect.

```ts
// src/hooks/session/useSessionSetup.ts
export function useSessionSetup() {
  const weights = useProgressStore.use.weights()
  const { data: questions } = useQuestionData() // already fetched by SessionConfigPage

  const startSession = useCallback((config: SessionConfig) => {
    const sampled = sampleWeighted(questions, weights, config)
    useSessionStore.getState().setSession(sampled, config)
    navigate(ROUTES.PLAY)
  }, [questions, weights])

  return { startSession }
}
```

Sampling only runs when the user explicitly taps "Start Session". No background computation.

---

### #8 — Per-Route ErrorBoundary with Recovery UX

**Problem:** Single root ErrorBoundary → full app crash on any runtime error → session state lost.

**Decision:** Two-tier ErrorBoundary system.

```
Router
  └── RootErrorBoundary          # catastrophic — "Reload app"
      ├── HomePage                # no EB — stateless page
      ├── SessionConfigPage
      │   └── RouteErrorBoundary # "Couldn't load configurator. Try again?"
      ├── QuestionPage            ← most critical
      │   └── RouteErrorBoundary # on catch: snapshot already in LS → "Progress saved. Retry"
      └── SummaryPage
          └── RouteErrorBoundary # "Couldn't show results. Go home?"
```

`RouteErrorBoundary` — single reusable component accepting `recoveryAction` prop. QuestionPage boundary: on catch, verifies snapshot exists in localStorage before showing "Progress saved" message. No false promise.

---

### #9 — Question Count Bounded by Real Availability

**Problem:** Architecture didn't specify what happens when weighted pool < requested count.

**Decision:** `availableCount` is always calculated from actual filtered pool. UI bounds input to `availableCount`.

```ts
// Calculated in useSessionConfig hook
const availableCount = useMemo(() =>
  allQuestions
    .filter(q => selectedCategories.includes(q.category))
    .filter(q => selectedDifficulties.includes(q.difficulty))
    .filter(q => selectedModes.includes(q.type))
    .length
, [allQuestions, selectedCategories, selectedDifficulties, selectedModes])

// count slider max = availableCount
// sampleWeighted never called with count > pool.length
```

Sampling is always **without replacement** within a session (no duplicate questions). If pool has 5 questions and user wants 50 from that pool — they get 5.

---

### #10 — Analytics: Pure Function Callable Anywhere

**Problem:** `useAnalytics` hook can't be called from stores. Analytics calls would be impossible outside React components.

**Decision:** `track()` is a plain function in `lib/analytics/` — callable from stores, hooks, components, anywhere. Hook is a thin re-export convenience.

```ts
// src/lib/analytics/index.ts — callable from ANYWHERE (stores, hooks, components)
export function track(event: AnalyticsEvent, params?: Record<string, unknown>) {
  window.gtag?.('event', event, params)
}

// src/hooks/analytics/useAnalytics.ts — convenience for components only
export const useAnalytics = () => ({ track })
```

Phase 2 additions (consent management, batching, A/B) added to `lib/analytics/` — no hook changes needed.

---

### #11 — Vite 8 Migration (Critical)

**Problem:** `rolldown-vite@7` is experimental. `vite-plugin-pwa` compatibility not guaranteed. PWA is a core v1 feature.

**Decision:** **Migrate to Vite 8** (stable, native Rolldown). vite-plugin-pwa is officially supported on Vite 8. Build performance improves 10-30x vs Vite 7 Rollup.

**Changes required:**
- `package.json`: `"vite": "^8.0.0"` (remove `rolldown-vite`)
- `vite.config.ts`: update imports if needed (Vite 8 is largely backwards-compatible)
- Verify `vite-plugin-pwa` version supports Vite 8 (check `peerDependencies`)
- This is the **first task** in the Foundation epic — before any feature work

Tech stack correction:

| Layer | Previous | Updated |
|-------|----------|---------|
| Bundler | Vite 7 (rolldown-vite experimental) | **Vite 8** (stable, native Rolldown) |

---

### #12 — queryKey Versioning

**Problem:** Same queryKey after deploy → TanStack Query serves stale data from in-memory cache.

**Decision:** Resolved by #5 (SW controllerchange → invalidateQueries) + `staleTime: 86_400_000`. No additional queryKey changes needed. The combination ensures:
- Active session: fresh data after deploy (invalidated on SW update)
- New session same day: 24h staleTime means data refetched at most once per day
- Offline: cached PWA data serves until next online session

---

### Updated Implementation Sequence

Revised to reflect all adversarial review fixes:

1. **Vite 8 migration** — update package.json, verify plugin compatibility
2. `src/lib/storage/keys.ts` — STORAGE_KEYS namespace
3. `src/lib/data/schema.ts` — zod schemas + Question types
4. `src/lib/storage/` — StorageService factory + LocalStorageService
5. `src/lib/algorithm/` — pure functions + ALGORITHM_CONFIG + unit tests
6. `src/store/` — session (with snapshot), progress, ui stores
7. `src/router/` — RootErrorBoundary + RouteErrorBoundary + lazy routes
8. `src/hooks/data/` — TanStack Query hooks (staleTime: 24h)
9. `src/hooks/session/useSessionSetup.ts` — imperative startSession
10. `src/components/features/` — Session → Question (Shiki progressive) → Summary
11. `src/lib/analytics/` + PwaUpdateToast + SW invalidation in main.tsx
12. Firebase Hosting + GitHub Actions CI/CD
