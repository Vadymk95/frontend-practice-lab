---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# InterviewOS - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for InterviewOS, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Session Management**
- FR1: User can configure a session by selecting one or more question categories
- FR2: User can filter session questions by difficulty level (easy, medium, hard)
- FR3: User can filter session questions by mode (quiz, bug finding, code completion, or all)
- FR4: User can set a maximum question count for a session
- FR5: User can see the total number of available questions matching their selection before starting
- FR6: User can choose question order (random or sequential)
- FR7: User can start a session with a weighted-random sampled subset of questions
- FR8: User can repeat only the incorrectly answered questions from a completed session
- FR39: User can save a session configuration as a preset and relaunch it
- FR40: User can preview available question counts per category and difficulty breakdown before starting a session
- FR41: User can skip a question and immediately see the correct answer and explanation
- FR42: At session end, user can choose to review: failed only / skipped only / both / restart full session
- FR43: User can delete individual saved session presets
- FR44: User can reset question weights per category or for the entire pool

**Question Answering**
- FR9: User can answer a single-choice question and receive instant result without confirming
- FR10: User can answer a multiple-choice question and submit selection for evaluation
- FR11: User can answer a bug-finding question by selecting from options or entering short text
- FR12: User can answer a code-completion question by filling in one or more blanks in a code snippet
- FR13: User can submit a code-completion or bug-finding answer and see a reference solution
- FR14: User always sees an explanation after answering regardless of correctness
- FR15: User can see syntax-highlighted code in bug-finding and code-completion questions
- FR45: Code completion answer validation is case-insensitive and ignores leading/trailing whitespace
- FR46: Code snippets are displayed in a mobile-optimised scrollable container

**Progress & Adaptation**
- FR16: System tracks per-topic error rate across sessions
- FR17: System increases question frequency for topics with high error rate (> 40%)
- FR18: System decreases (but never eliminates) question frequency for topics with low error rate (< 15%)
- FR19: User can view a post-session summary showing score and weakest topics
- FR20: User's progress data persists between sessions via localStorage
- FR33: System maintains a persistent weight per question across sessions
- FR34: System samples questions using weighted random selection
- FR35: Questions are never removed from the pool regardless of mastery level
- FR47: System tracks and displays daily usage streak
- FR48: Question weight has a maximum cap; algorithm constants externalised in a config object; core algorithm logic covered by unit tests
- FR49: System gracefully ignores stored weights for question IDs that no longer exist in data

**Timer & Records**
- FR36: User can start a session with an optional timer
- FR37: System records the fastest completion time per unique session configuration
- FR38: User is congratulated and a new record is saved when beating the previous best time

**Theming & i18n**
- FR32: User can toggle between light and dark theme; preference persists; default is dark
- FR50: User can switch the interface language between Russian and English; preference persists; default is Russian
- FR51: Code snippets are always displayed in English regardless of the active interface language

**Content & Categories**
- FR21: System loads question data from structured JSON files at session start
- FR22: System supports 17 question categories in MVP
- FR23: Admin can add, edit, or delete questions by modifying JSON data files
- FR24: Admin can add a new category without modifying application code
- FR25: System validates JSON content structure at build time via CI schema check
- FR26: Admin has access to a content contribution guide documenting schema and patterns

**Application & Access**
- FR27: User can access the application without authentication or registration
- FR28: User can install the application to their device home screen (PWA)
- FR29: User can use the application offline after initial load (cached content)
- FR30: User is notified when a new version is available and can apply the update immediately
- FR31: System tracks session engagement events via analytics

### NonFunctional Requirements

**Performance**
- NFR1: Initial app shell loads in < 2s on 4G mobile (FCP)
- NFR2: JSON data fetch completes in < 2s on 4G mobile; loader shown during fetch
- NFR3: All UI interactions (answer reveal, navigation) respond in < 100ms
- NFR4: No blocking renders — app shell displays before data is available

**Accessibility**
- NFR5: WCAG AA compliance as baseline (contrast ratio 4.5:1, focus-visible, keyboard navigation)
- NFR6: Tap targets ≥ 44×44px on mobile
- NFR7: Font size minimum 16px for question text; 14px for secondary UI
- NFR8: No content relies solely on colour to convey meaning (correct/wrong uses icon + colour)

**Reliability**
- NFR9: Adaptive algorithm must not produce infinite loops, weight overflow, or NaN values
- NFR10: Algorithm constants (weight multipliers, cap values) externalised in a single config object
- NFR11: Core algorithm logic covered by unit tests; any change to constants triggers test re-run
- NFR12: Stale question IDs in localStorage are silently ignored — no crash, no data loss

**Maintainability**
- NFR13: New question category deployable by adding one JSON file — zero application code changes required
- NFR14: JSON schema validated at build time; malformed content blocks deployment
- NFR15: Storage layer (localStorage reads/writes) encapsulated behind a single service — swappable for Firebase without UI changes

### Additional Requirements

Architecture technical requirements that impact implementation:

- **No starter template** — project already initialized with custom scaffold; architecture formalizes patterns on top
- **JSON data location:** `public/data/<category>.json` — served as static assets, PWA-cached by SW, fetched via TanStack Query
- **Zod schemas:** `src/lib/data/schema.ts` — single source of truth for runtime validators and TypeScript types; all 4 question types defined
- **StorageService interface:** `src/lib/storage/` — `LocalStorageService` in v1, Firebase-swappable in v2 (zero UI changes)
- **Three Zustand stores:** `sessionStore` (not persisted), `progressStore` (persisted), `uiStore` (persisted); all use `createSelectors`
- **Algorithm module:** `src/lib/algorithm/` — pure functions, zero side effects, all constants in `ALGORITHM_CONFIG`
- **Analytics service:** `src/lib/analytics/` — 11 events taxonomy, no direct GA calls in components
- **Routing:** HomePage + NotFoundPage [eager], SessionConfigPage + QuestionPage + SummaryPage [lazy + WithSuspense]; ErrorBoundary at router root
- **CI/CD:** `ci.yml` (lint → tsc → validate:data → test), `deploy.yml` (ci + build + firebase deploy on main)
- **Firebase Hosting:** v1 static SPA deployment; Firebase SDK (Firestore/Auth) deferred to v2
- **Import boundaries enforced:** `lib/algorithm/` → `lib/data/types` only; stores → `lib/*` only; pages → `components/`, `hooks/`, `lib/*`; no cross-store direct calls
- **DevPlayground route:** `/dev-playground`, DEV-only, Vite build-time excluded from production bundle
- **Error states:** JSON fetch failure (ErrorState + Retry), 0 results (inline empty state), offline no cache, runtime error (ErrorBoundary)
- **CI schema validation script:** `npm run validate:data` → `src/scripts/validate-data.ts`
- **GitHub Actions secrets:** `FIREBASE_TOKEN` required in repo settings for deploy workflow

### UX Design Requirements

- **UX-DR1:** Implement design token system — all colours, spacing, radii, durations as CSS variables in `src/index.css` under `@theme inline {}`; no hardcoded values in components
- **UX-DR2:** Implement semantic colour split — terminal green (`#00ff87`) for correct/brand only; electric blue (`#3b82f6`) for action/navigation/CTAs/focus rings; error red (`#ef4444`) for wrong/danger; rule strictly enforced: green never on interactive controls, blue never as answer feedback
- **UX-DR3:** Implement typography system — JetBrains Mono (weights 400/500/600) for all UI chrome (buttons, labels, badges, headers, question text); system sans-serif for prose only (explanation text, error messages); 7-level type scale from 24px heading-1 to 12px caption
- **UX-DR4:** Implement light mode token overrides in addition to default dark; `prefers-reduced-motion` CSS rule disables all transitions globally
- **UX-DR5:** Implement `QuestionCard` custom component — anatomy: progress indicator + category badge + difficulty badge + question text; states: loading (skeleton), active, answered; variants: standard, code, long; ARIA: `role="article"`, `aria-label="Question N of M"` on progress
- **UX-DR6:** Implement `AnswerOption` custom component — anatomy: key indicator (A/B/C/D) + option text; states: default, hover, selected, correct, wrong, disabled; variants: radio (single-choice) and checkbox (multi-choice); mobile spec: min-height 52px, full-width; ARIA: `role="radio"/"checkbox"`, `aria-checked`, `aria-disabled`
- **UX-DR7:** Implement `CodeBlock` custom component — syntax-highlighted using **Shiki** (`github-dark` theme, VS Code Dark+ palette); anatomy: language label + copy button + code content; states: display-only and interactive (code-completion blanks as inline `<input>`); max-height 320px mobile / 480px desktop with internal scroll; ARIA: `role="region"`, `aria-label="Code snippet"`
- **UX-DR8:** Implement `ExplanationPanel` custom component — always shown post-answer, slides in ≤150ms; anatomy: "Explanation" label + explanation text + optional reference solution code block; focus moves to panel on reveal for keyboard users; ARIA: `role="complementary"`
- **UX-DR9:** Implement `SessionSummary` custom component — anatomy: score ("38/50") + weak topics list + streak indicator + action CTAs; states: default, perfect-score (no repeat CTA), with-mistakes; CTAs: "Repeat mistakes" (primary, only if wrong answers) + "New session" (secondary) + "Home" (ghost); perfect-score alternative: "Try again" + "Try something else" + "Clear session weights"
- **UX-DR10:** Implement `SessionConfigurator` custom component — anatomy: algorithm widget (top, shown only post-first-session) + category grid (with per-category error rate badge > 30%) + difficulty filter + mode filter + count input + order toggle + live question count + preset list + Start CTA; live count debounced 150ms; empty-results state instructional; ARIA: category grid as `role="group"` with checkboxes
- **UX-DR11:** Implement `PresetRow` custom component — anatomy: preset name + config summary + last-used date + delete button; ARIA: delete `aria-label="Delete preset [name]"`
- **UX-DR12:** Implement sticky bottom bar for mobile (< 1024px) — height 72px, surface background + top border, contains primary CTA only; desktop: inline CTA below content, right-aligned within 760px column
- **UX-DR13:** Implement preset-first home screen — preset is primary CTA, not "New Session"; algorithm widget surfaces ≤3 weak topics with error rate badges; tapping topic pre-selects category in grid
- **UX-DR14:** Implement answer reveal pattern — correct: `bg-accent/10` + `border-accent` + checkmark icon + explanation; wrong: selected `bg-error/10` + `border-error` + cross icon, correct option highlighted; explanation identical visual weight for correct and wrong states
- **UX-DR15:** Implement back button for misclick protection — appears in question header only after answer reveal; undoes last answer only; disappears once Next is tapped
- **UX-DR16:** Implement keyboard navigation for desktop — options 1–4 to select, Enter to confirm/advance, Space to toggle; focus-visible: `outline-2 outline-accent-alt outline-offset-2` (blue) on all keyboard-focused elements
- **UX-DR17:** Implement responsive layout — mobile < 768px: 16px padding, full-width; tablet 768–1023px: 24px, max-width 680px centred; desktop ≥ 1024px: 32px, max-width 760px centred; sticky bar mobile-only (< 1024px)
- **UX-DR18:** Implement DevPlayground route — DEV-only (excluded from production build via `import.meta.env.DEV`); sections per component showing all states; first section: Direction A question card variants (all 4 question types)
- **UX-DR19:** Implement interaction micro-patterns — tap feedback: `active:opacity-80`; spinner after 200ms (no flicker on fast connections); skeleton loaders during JSON fetch; transition budget: reveals ≤150ms, page transitions ≤200ms; `aria-live="polite"` on question counter; skip link in AppShell
- **UX-DR20:** Implement PWA update toast — bottom of screen, non-blocking, auto-dismiss 5s, persists until user acts for PWA updates; PWA install prompt shown after first session completion (not on first visit)
- **UX-DR21:** Implement all error states as instructional — JSON fetch failure (full): "Could not load questions. Check your connection." + Retry; partial fetch failure: "Some questions could not be loaded ([Category] unavailable)" + Continue/Retry; offline no cache: explanatory message; zero results: "No questions match. Try removing a difficulty filter..." with total available count shown

### FR Coverage Map

FR1: Epic 1 — Session category selection
FR2: Epic 1 — Session difficulty filter
FR3: Epic 1 — Session mode filter
FR4: Epic 1 — Session question count limit
FR5: Epic 1 — Available question count display
FR6: Epic 1 — Question order (random/sequential)
FR7: Epic 1 — Weighted-random session sampling
FR8: Epic 3 — Repeat incorrect answers
FR9: Epic 1 — Single-choice instant reveal
FR10: Epic 2 — Multi-choice Check button flow
FR11: Epic 2 — Bug-finding answer flow
FR12: Epic 2 — Code-completion fill-in-blank
FR13: Epic 2 — Reference solution display
FR14: Epic 1 — Explanation always shown
FR15: Epic 2 — Syntax-highlighted code in questions
FR16: Epic 4 — Per-topic error rate tracking
FR17: Epic 4 — Increase frequency for high error rate topics
FR18: Epic 4 — Decrease frequency for low error rate topics
FR19: Epic 1 — Post-session summary (score + weak topics)
FR20: Epic 1 — Progress persists via localStorage
FR21: Epic 1 — Load question data from JSON files
FR22: Epic 1 — 17 question categories
FR23: Epic 5 — Admin adds/edits/deletes questions via JSON
FR24: Epic 5 — New category without code changes
FR25: Epic 5 — CI JSON schema validation
FR26: Epic 5 — Content contribution guide
FR27: Epic 1 — Zero-auth read-only access
FR28: Epic 6 — PWA installable to home screen
FR29: Epic 6 — Offline mode after initial load
FR30: Epic 6 — PWA update notification toast
FR31: Epic 6 — Google Analytics session tracking
FR32: Epic 6 — Dark/light theme toggle (persisted, default dark)
FR33: Epic 4 — Persistent weight per question across sessions
FR34: Epic 4 — Weighted random question sampling
FR35: Epic 4 — Questions never removed from pool
FR36: Epic 4 — Optional session timer
FR37: Epic 4 — Fastest completion time records per config
FR38: Epic 4 — New record congratulation
FR39: Epic 3 — Save and relaunch session presets
FR40: Epic 3 — Per-category question count preview before start
FR41: Epic 3 — Skip question with immediate answer reveal
FR42: Epic 3 — Post-session review options (failed/skipped/both/restart)
FR43: Epic 3 — Delete individual saved presets
FR44: Epic 5 — Reset question weights per category or full pool
FR45: Epic 2 — Case-insensitive code-completion validation
FR46: Epic 2 — Mobile-optimised scrollable code snippet container
FR47: Epic 4 — Daily usage streak tracking and display
FR48: Epic 4 — Weight cap + externalised algorithm config + unit tests
FR49: Epic 4 — Graceful ignore of stale localStorage question IDs
FR50: Epic 6 — RU/EN language toggle (persisted, default Russian)
FR51: Epic 6 — Code snippets always in English regardless of language

## Epic List

### Epic 1: Core App Shell & Single-Choice Quiz
User can access the deployed app, configure a basic session (categories, difficulty, mode, count, order), answer single-choice questions, see explanations, and view a post-session score summary. All foundational infrastructure (routing, data layer, CI/CD, StorageService, app shell, design tokens) is in place.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR9, FR14, FR19, FR20, FR21, FR22, FR27
**UX-DRs covered:** UX-DR1 (design tokens), UX-DR2 (colour split), UX-DR3 (typography), UX-DR4 (dark mode + reduced motion), UX-DR5 (QuestionCard), UX-DR6 (AnswerOption), UX-DR8 (ExplanationPanel), UX-DR9 (SessionSummary), UX-DR12 (sticky bottom bar), UX-DR17 (responsive layout), UX-DR19 (interaction micro-patterns)

### Epic 2: Complete Question Type Suite
User can answer all 4 question types — multi-choice with Check button, bug-finding with Submit + self-assessment (Got it / Missed it), and code-completion with fill-in-the-blank inputs. All code content is syntax-highlighted using VS Code Dark+ palette.
**FRs covered:** FR10, FR11, FR12, FR13, FR15, FR45, FR46
**UX-DRs covered:** UX-DR7 (CodeBlock), UX-DR14 (answer reveal pattern), UX-DR15 (back button misclick protection)

### Epic 3: Session Efficiency & Presets
User can save session configurations as presets and relaunch with one tap, skip questions, repeat only wrong answers, preview per-category question counts before starting, choose post-session review mode, and delete individual presets.
**FRs covered:** FR8, FR39, FR40, FR41, FR42, FR43
**UX-DRs covered:** UX-DR10 (SessionConfigurator + algorithm widget), UX-DR11 (PresetRow), UX-DR13 (preset-first home screen)

### Epic 4: Adaptive Algorithm & Progress Tracking
System tracks per-topic error rates across sessions, adjusts question frequency based on performance, maintains daily streaks, records fastest completion times per session configuration, and surfaces adaptive insights to the user. Algorithm is transparent, unit-tested, and configuration is externalised.
**FRs covered:** FR16, FR17, FR18, FR33, FR34, FR35, FR36, FR37, FR38, FR47, FR48, FR49

### Epic 5: Content Administration
Admin can add, edit, and delete questions by modifying JSON files (manual or AI-agent path), add new categories without code changes, access a content contribution guide, run CI schema validation that blocks deployment on malformed content, and reset question weights per category or globally.
**FRs covered:** FR23, FR24, FR25, FR26, FR44

### Epic 6: PWA, i18n, Theming & Analytics
App is installable to device home screen, works offline after first load, shows non-blocking update notifications, supports RU/EN language toggle and dark/light theme, tracks session engagement via Google Analytics, meets full WCAG AA accessibility, includes DevPlayground for component development, and runs on Vite 8 (Rolldown unified bundler).
**FRs covered:** FR28, FR29, FR30, FR31, FR32, FR50, FR51
**UX-DRs covered:** UX-DR16 (keyboard nav), UX-DR18 (DevPlayground), UX-DR20 (PWA toast), UX-DR21 (error states)
**Tech:** Vite 7 → 8 migration (Rolldown unified bundler, Node.js 20.19+/22.12+)

---

## Epic 1: Core App Shell & Single-Choice Quiz

Users can access the deployed app, configure a basic session (categories, difficulty, mode, count, order), answer single-choice questions, see explanations, and view a post-session score summary. All foundational infrastructure (routing, data layer, CI/CD, StorageService, app shell, design tokens) is in place.

### Story 1.1: Design System Tokens & App Shell

As a **developer**,
I want the design token system and app shell implemented,
So that all future components can reference a consistent visual foundation and the user sees a functional app frame.

**Acceptance Criteria:**

**Given** the app is opened in any supported browser
**When** the page loads
**Then** the app shell renders with AppHeader (logo + language toggle placeholder + theme toggle placeholder) and a main content area
**And** the background is `#0d0d0d` (dark mode default), all colour tokens are defined in `src/index.css` under `@theme inline {}`
**And** JetBrains Mono is loaded and applied as the global font
**And** the layout is single-column, 16px padding on mobile, 24px on tablet (≥768px), 32px on desktop (≥1024px), max-width 760px centred on desktop

**Given** a user has `prefers-reduced-motion: reduce` set
**When** any component renders
**Then** all CSS transitions and animations are disabled via a global rule in `index.css`

**Given** a developer opens `/dev-playground` on localhost
**When** the page loads in development mode (`import.meta.env.DEV`)
**Then** the DevPlayground route renders and is accessible
**And** the route does not exist in the production build

---

### Story 1.2: Question Data Schema & Storage Infrastructure

As a **developer**,
I want the question data schema and storage layer implemented,
So that all other features can load typed question data and persist user progress safely.

**Acceptance Criteria:**

**Given** the `src/lib/data/schema.ts` file exists
**When** a developer imports question types
**Then** all 4 zod schemas are available (`SingleChoiceQuestion`, `MultiChoiceQuestion`, `BugFindingQuestion`, `CodeCompletionQuestion`) with correct TypeScript types inferred
**And** `src/lib/data/categories.ts` is removed — category list is dynamic, sourced from `public/data/manifest.json`

**Given** `src/scripts/generate-manifest.ts` exists
**When** `npm run build:manifest` runs
**Then** it scans all `public/data/*.json` files and outputs `public/data/manifest.json` containing slug, display name, and question counts per difficulty for each category
**And** `build:manifest` is called before `vite build` in CI (`deploy.yml`) and locally via `npm run build`

**Given** `public/data/manifest.json` exists
**When** the `useCategories()` shared hook is called on the home screen
**Then** it fetches only the manifest (~1KB) via TanStack Query — not the full question JSON files
**And** the SessionConfigurator renders all available categories from the manifest without any hardcoded list

**Given** the `src/lib/algorithm/index.ts` and `src/lib/algorithm/config.ts` are created
**When** the algorithm module is imported
**Then** `ALGORITHM_CONFIG` exports all constants (thresholds, multipliers, weight bounds)
**And** `sampleWeighted(questions, weights, count)` is implemented and exported — works with any weights including default 1.0
**And** questions are never removed from the pool regardless of their weight value — minimum weight `MIN_WEIGHT` ensures every question remains eligible (FR35)
**And** basic unit tests for `sampleWeighted()` pass (correct count, handles count > pool, equal weights = uniform-ish distribution, no question excluded at minimum weight)

**Given** sample JSON files exist in `public/data/` (at minimum 2 categories with 5+ questions each)
**When** `npm run validate:data` is executed
**Then** it exits with code 0 for valid files and code 1 for any schema violation

**Given** the `StorageService` interface is defined in `src/lib/storage/types.ts`
**When** `LocalStorageService` is used
**Then** all methods (getWeights, setWeights, getErrorRates, setErrorRates, getStreak, getTheme, getLanguage, getPresets, etc.) read/write to localStorage with correct keys
**And** `LocalStorageService` is exported as a singleton from `src/lib/storage/index.ts`

**Given** all three Zustand stores are scaffolded
**When** the app initialises
**Then** `sessionStore` (`src/store/session/`) is created — not persisted, holds active session state
**And** `progressStore` (`src/store/progress/`) is created — persisted via `StorageService`, holds weights + error rates + streak + records
**And** `uiStore` (`src/store/ui/`) is created — persisted via `StorageService`, holds theme + language
**And** all stores use `createSelectors` from `src/store/utils/createSelectors.ts`

**Given** the `uiStore` is initialized
**When** the app loads for the first time
**Then** theme defaults to `'dark'` and language defaults to `'ru'`
**And** both values are persisted to localStorage on change

---

### Story 1.3: Session Configurator — Basic Configuration

As a **user**,
I want to configure a session by selecting categories, difficulty, mode, question count, and order,
So that I can start a focused practice session tailored to my current needs.

**Acceptance Criteria:**

**Given** the user is on the home screen (`/`)
**When** the SessionConfigurator renders
**Then** all 17 category buttons are displayed in a grid, each tappable to toggle selection
**And** difficulty filter shows 3 options (easy / medium / hard) as radio-style toggles
**And** mode filter shows 4 options (quiz / bug finding / code completion / all) as radio-style toggles
**And** question count input accepts a number (min 1, max = available count)
**And** order toggle offers random / sequential

**Given** the user selects or changes any filter
**When** the filter state updates
**Then** the live available question count recalculates within 150ms (debounced)
**And** the count reflects the intersection of selected categories, difficulty, and mode

**Given** the user opens the home screen for the first time (no presets, no prior config)
**When** the SessionConfigurator renders
**Then** no categories are pre-selected
**And** the Start button is disabled
**And** the live count shows "0 questions selected"
**And** a hint is visible: "Select at least one category to begin"

**Given** no categories are selected or available count is 0
**When** the configurator renders
**Then** an empty state is shown: "No questions match your selection. Try removing a difficulty filter or selecting more categories." with total available count shown
**And** the Start button is disabled

**Given** at least one category is selected with count > 0
**When** the user taps Start
**Then** the app navigates to `/session/play` with the configured session parameters
**And** no authentication or registration is required at any point — the app is fully accessible without an account (FR27)

---

### Story 1.4: Weighted Session Sampling & Session Start

As a **user**,
I want the app to sample questions based on my configured filters,
So that my session contains the right questions drawn from my selected categories.

**Acceptance Criteria:**

**Given** a valid session configuration is confirmed
**When** the session starts
**Then** `useSessionSetup` fetches JSON data for all selected categories via TanStack Query (parallel fetches)
**And** a spinner is shown if fetch takes > 200ms; no blank screen is shown
**And** on fetch error: full-screen `ErrorState` with "Could not load questions. Check your connection." + Retry button

**Given** data is loaded successfully
**When** questions are sampled
**Then** `sampleWeighted()` from `src/lib/algorithm/` is used with default weights (all 1.0 on first use)
**And** the sampled list respects the configured count limit
**And** for `order: 'sequential'` questions are sorted by difficulty (easy → hard); for `order: 'random'` they are shuffled

**Given** the session questions are ready
**When** the user is navigated to `/session/play`
**Then** `sessionStore` holds the full question list, current index = 0, and answers = `{}`
**And** progress indicator shows "1 / N" where N is the total question count

---

### Story 1.5: Single-Choice Question & Answer Reveal

As a **user**,
I want to tap an option on a single-choice question and immediately see if I was right,
So that I can get instant feedback and read the explanation without extra steps.

**Acceptance Criteria:**

**Given** the user is on a single-choice question
**When** the question renders
**Then** `QuestionCard` displays: progress ("Q of N"), category badge, difficulty badge, and question text
**And** 2–5 `AnswerOption` components are shown below, each min-height 52px on mobile, full-width, with key indicator (A/B/C/D)
**And** primary CTA (Next) is anchored to the sticky bottom bar on mobile (< 1024px); inline below content on desktop

**Given** the user taps an option (pre-reveal)
**When** the tap registers
**Then** the selected option highlights immediately (< 100ms)
**And** the answer is evaluated instantly with no Check button required
**And** if correct: selected option → `bg-accent/10` + `border-accent` + checkmark icon
**And** if wrong: selected option → `bg-error/10` + `border-error` + cross icon; correct option → `bg-accent/10` + `border-accent` + checkmark
**And** `ExplanationPanel` slides in below within ≤ 150ms
**And** all other options become disabled

**Given** the answer has been revealed
**When** the user taps "Next"
**Then** the next question renders within 200ms
**And** if it was the last question, navigation goes to `/session/summary`

**Given** the user is on desktop with keyboard
**When** keys 1–4 are pressed
**Then** the corresponding option is selected; Enter advances to next question

---

### Story 1.6: Post-Session Summary

As a **user**,
I want to see my score and weak topics after completing a session,
So that I know how I performed and what to focus on next.

**Acceptance Criteria:**

**Given** the user has answered all questions in the session
**When** the SummaryPage renders
**Then** `SessionSummary` shows the score prominently ("38 / 50")
**And** weak topics are listed (categories where error rate > 30% this session)
**And** if wrong answers exist: "Repeat mistakes" is shown as primary CTA
**And** if no wrong answers: "50 / 50" displayed; CTAs are "Try again" + "Try something else" + "Home"
**And** "New session" (secondary) and "Home" (ghost) are always present

**Given** the session completes
**When** progress is saved
**Then** per-question answer results are written to `progressStore`
**And** `progressStore` persists to localStorage via `StorageService`
**And** data survives page reload

**Given** the user taps "Repeat mistakes"
**When** navigation occurs
**Then** a new session loads containing only the incorrectly answered questions from the completed session

---

### Story 1.7: CI/CD Pipeline & Firebase Hosting

As a **developer**,
I want CI/CD automation and Firebase Hosting configured,
So that every push is validated and every merge to main auto-deploys the app.

**Acceptance Criteria:**

**Given** a push or PR to any branch
**When** GitHub Actions `ci.yml` runs
**Then** the pipeline executes in order: `lint` → `tsc --noEmit` → `npm run validate:data` → `npm run test`
**And** any step failure blocks the pipeline

**Given** a push to `main` branch
**When** `deploy.yml` runs
**Then** all CI checks pass first, then `vite build` runs, then `firebase deploy --only hosting` deploys `dist/`
**And** `firebase.json` includes SPA rewrites (`"**"` → `/index.html`) and cache headers for `*.js`/`*.css` (1 year) and `/data/**` (1 day)

**Given** the `FIREBASE_TOKEN` secret is set in GitHub repo settings
**When** the deploy workflow authenticates
**Then** deployment succeeds without manual intervention
**And** `.firebaserc` contains `{ "projects": { "default": "<project-id>" } }`

---

## Epic 2: Complete Question Type Suite

Users can answer all 4 question types — multi-choice with Check button, bug-finding with Submit + self-assessment, and code-completion with fill-in-the-blank inputs. All code content is syntax-highlighted using VS Code Dark+ palette.

### Story 2.1: Multi-Choice Question with Check Button

As a **user**,
I want to select multiple options and confirm my answer with a Check button,
So that I can answer questions that require multiple correct selections before seeing the result.

**Acceptance Criteria:**

**Given** the current question is of type `multi-choice`
**When** the question renders
**Then** `AnswerOption` components render in checkbox variant (multi-select enabled)
**And** a "Check" primary CTA is shown in the sticky bottom bar (disabled until at least one option selected)

**Given** the user selects one or more options and taps "Check"
**When** the answer is evaluated
**Then** correct selections → `bg-accent/10` + `border-accent` + checkmark; incorrect selections → `bg-error/10` + `border-error` + cross
**And** any correct options the user missed also highlight with `bg-accent/10`
**And** `ExplanationPanel` appears within ≤ 150ms
**And** "Next" replaces "Check" in the bottom bar

**Given** the answer is revealed
**When** the result is recorded
**Then** the answer is stored as correct only if all correct options were selected and no incorrect ones were included

---

### Story 2.2: CodeBlock Component with Syntax Highlighting

As a **user**,
I want to see code snippets with syntax highlighting,
So that I can read code as clearly as in my editor without straining to parse plain text.

**Acceptance Criteria:**

**Given** a question contains a `code` field
**When** the `CodeBlock` component renders
**Then** syntax highlighting is applied using **Shiki** (`github-dark` theme, VS Code Dark+ colour palette)
**And** the language label is shown top-left; a copy button top-right
**And** on mobile: `max-height: 320px` with internal vertical scroll; horizontal scroll for long lines; no layout breakage at 375px
**And** on desktop: `max-height: 480px`

**Given** `CodeBlock` is rendered in DevPlayground
**When** a developer views the playground
**Then** both readonly and interactive variants are shown with all states

---

### Story 2.3: Bug-Finding Question with Self-Assessment

As a **user**,
I want to identify a bug in a code snippet and self-assess my answer,
So that I can practice spotting real-world errors and compare against a reference solution.

**Acceptance Criteria:**

**Given** the current question is of type `bug-finding`
**When** the question renders
**Then** `CodeBlock` (readonly) displays the code snippet with syntax highlighting
**And** answer options (if present) or a short text input is shown below
**And** "Submit" is the primary CTA in the sticky bottom bar

**Given** the user selects an option or types an answer and taps "Submit"
**When** the answer is evaluated
**Then** the reference solution is revealed in a `CodeBlock` below
**And** `ExplanationPanel` appears with the explanation
**And** "Got it" (accent outline) and "Missed it" (ghost) self-assessment buttons replace "Submit"

**Given** the user taps "Got it" or "Missed it"
**When** the self-assessment is recorded
**Then** the answer is stored as correct ("Got it") or incorrect ("Missed it") in `sessionStore`
**And** "Next" becomes active

---

### Story 2.4: Code-Completion Question with Blank Inputs

As a **user**,
I want to fill in blanks within a code snippet to complete it,
So that I can practice recalling exact syntax in context.

**Acceptance Criteria:**

**Given** the current question is of type `code-completion`
**When** the question renders
**Then** `CodeBlock` (interactive) displays the code with `__BLANK__` markers replaced by inline `<input>` elements styled as code (monospace, same background)
**And** "Submit" is the primary CTA (disabled until all blanks are filled)

**Given** the user fills all blanks and taps "Submit"
**When** answers are validated
**Then** each blank is compared case-insensitively with leading/trailing whitespace trimmed (FR45)
**And** correct blanks highlight with accent colour; incorrect blanks highlight with error colour and show the expected value
**And** `ExplanationPanel` and reference solution appear
**And** "Next" becomes active

**Given** all blanks are correct
**When** the answer is recorded
**Then** it is stored as correct in `sessionStore`

---

### Story 2.5: Back Button — Misclick Protection

As a **user**,
I want to undo my last answer immediately after tapping,
So that I can recover from accidental taps on single-choice questions without losing session progress.

**Acceptance Criteria:**

**Given** the user has just revealed an answer (any question type)
**When** the answer state is active (reveal shown, Next not yet tapped)
**Then** a "Back" ghost button appears in the question header

**Given** the user taps "Back"
**When** the undo action fires
**Then** the current question returns to unanswered state (options reset, ExplanationPanel hidden)
**And** the answer is removed from `sessionStore`
**And** the "Back" button disappears

**Given** the user taps "Next" after an answer reveal
**When** navigation to the next question occurs
**Then** the "Back" button is no longer available for the previous question
**And** session moves forward only — no further undo possible

---

## Epic 3: Session Efficiency & Presets

Users can save session configurations as presets and relaunch with one tap, skip questions, repeat only wrong answers, preview per-category question counts before starting, choose post-session review mode, and delete individual presets.

### Story 3.1: Session Presets — Save & Relaunch

As a **user**,
I want to save my current session configuration as a preset and relaunch it with one tap,
So that I can start my daily habit session without reconfiguring every morning.

**Acceptance Criteria:**

**Given** the user has configured a session in the SessionConfigurator
**When** they tap "Save preset"
**Then** a preset is saved via `StorageService.savePreset()` with a generated name (e.g. "JS+TS · medium · 50q") and current timestamp
**And** the preset appears in the preset list on the home screen immediately

**Given** presets exist in storage
**When** the home screen loads
**Then** the preset list is shown with each preset displayed as a `PresetRow` (name, config summary, last-used date)

**Given** the user taps a `PresetRow`
**When** the preset launches
**Then** the session starts immediately with the preset config (skipping configurator re-entry)
**And** the preset's last-used timestamp updates in storage

---

### Story 3.2: Preset Management — Delete

As a **user**,
I want to delete individual saved presets,
So that I can keep my preset list clean without accumulating outdated configurations.

**Acceptance Criteria:**

**Given** presets exist in the preset list
**When** the user taps the delete button on a `PresetRow`
**Then** a confirmation `Dialog` appears: "Delete preset '[name]'?"
**And** on confirm: preset is removed via `StorageService.deletePreset(id)` and the list updates immediately
**And** on cancel: nothing changes

**Given** the last preset is deleted
**When** the preset list is empty
**Then** muted text "No saved presets yet" is shown — no illustration, no empty-state graphic

---

### Story 3.3: Per-Category Question Count Preview

As a **user**,
I want to see the available question count per category and difficulty breakdown before starting,
So that I can make informed filter choices without guessing how many questions I'll get.

**Acceptance Criteria:**

**Given** the user is on the SessionConfigurator
**When** they view the category grid
**Then** each category chip shows its total available question count
**And** on interaction (hover/tap), a breakdown by difficulty is shown (easy N / medium N / hard N)
**And** this data comes from `public/data/manifest.json` already loaded by `useCategories()` on the home screen — no additional fetch, no full JSON loading required

**Given** the user applies difficulty or mode filters
**When** the live count updates
**Then** the per-category breakdown also reflects the active filters
**And** categories with 0 matching questions are visually dimmed but remain selectable

---

### Story 3.4: Skip Question

As a **user**,
I want to skip a question and immediately see the answer,
So that I can move past questions I'm stuck on without breaking my session flow.

**Acceptance Criteria:**

**Given** the user is on an unanswered question
**When** they tap the "Skip" ghost button (visible in question header)
**Then** the question is marked as skipped in `sessionStore`
**And** the correct answer and `ExplanationPanel` are revealed immediately
**And** the skipped answer is recorded as incorrect for progress tracking purposes
**And** "Next" becomes active

**Given** a skipped question is recorded
**When** the adaptive algorithm processes session results
**Then** the skipped question is treated as incorrect for weight calculation — error rate for that category increases
**And** the distinction "skipped vs wrong" exists only in the session summary UI — not in the algorithm logic

**Given** the session ends with skipped questions
**When** the post-session summary renders
**Then** skipped count is shown separately from wrong answers in the summary

---

### Story 3.5: Post-Session Review Mode Selection

As a **user**,
I want to choose what to review at the end of a session — only failed, only skipped, both, or restart,
So that I can focus my review time on exactly what I need.

**Acceptance Criteria:**

**Given** the session has ended and the SummaryPage is shown
**When** the summary renders
**Then** review options are shown based on what exists:
- "Repeat wrong answers (N)" — shown only if wrong answers exist
- "Repeat skipped (N)" — shown only if skipped questions exist
- "Repeat all mistakes (N)" — shown only if both wrong and skipped exist
- "Restart session" — always shown as a secondary option

**Given** the user selects a review option
**When** the review session loads
**Then** `sessionStore` is populated with only the relevant subset of questions
**And** the session starts with progress "1 / N" reflecting the subset count

---

### Story 3.6: Preset-First Home Screen

As a **user**,
I want presets to be the primary call-to-action on the home screen,
So that my daily session starts with one tap instead of reconfiguring every time.

**Acceptance Criteria:**

**Given** at least one preset exists
**When** the home screen loads
**Then** the most recently used preset is shown as the primary CTA above the configurator
**And** the preset card shows: name, config summary, and a prominent "Start" button
**And** a "Modify" link opens the SessionConfigurator pre-filled with the preset config

**Given** no presets exist (first visit)
**When** the home screen loads
**Then** the SessionConfigurator is shown directly with no preset section
**And** no empty-state placeholder for presets — the configurator fills the space naturally

**Given** multiple presets exist
**When** the home screen loads
**Then** the most recently used is shown as primary; remaining presets are listed below as `PresetRow` components

---

## Epic 4: Adaptive Algorithm & Progress Tracking

System tracks per-topic error rates across sessions, adjusts question frequency based on performance, maintains daily streaks, records fastest completion times per session configuration, and surfaces adaptive insights to the user. Algorithm is transparent, unit-tested, and configuration is externalised.

### Story 4.1: Adaptive Algorithm — Core Implementation

As a **developer**,
I want the adaptive algorithm implemented as a pure, fully-tested module,
So that question weights are calculated reliably without side effects or edge-case failures.

**Acceptance Criteria:**

**Note:** `sampleWeighted()` and `ALGORITHM_CONFIG` are already created in Story 1.2. This story adds the adaptive functions on top.

**Given** `calculateWeight(errorRate, currentWeight)` is called
**When** `errorRate > HIGH_ERROR_THRESHOLD`
**Then** the returned weight increases (× `HIGH_ERROR_MULTIPLIER`), capped at `MAX_WEIGHT`
**When** `errorRate < LOW_ERROR_THRESHOLD`
**Then** the returned weight decreases (× `LOW_ERROR_MULTIPLIER`), floored at `MIN_WEIGHT`
**And** the result is never `NaN`, `Infinity`, or negative under any input

**Given** `updateErrorRate(previous, correct)` is called
**When** `correct = true`
**Then** the error rate decreases proportionally (rolling average or decay formula)
**When** `correct = false`
**Then** the error rate increases proportionally
**And** the result is always in range [0, 1]

**Given** `algorithm.test.ts` runs
**When** all test cases execute
**Then** `calculateWeight()` and `updateErrorRate()` are covered at 100% including edge cases (NaN input guard, boundary values at thresholds, max/min cap enforcement)
**And** `sampleWeighted()` tests from Story 1.2 continue to pass unchanged

---

### Story 4.2: Per-Topic Error Rate Tracking

As a **user**,
I want the system to track my error rate per topic across sessions,
So that the adaptive algorithm has accurate data to surface my weak areas.

**Acceptance Criteria:**

**Given** a session completes with answered questions
**When** results are processed in `progressStore`
**Then** `updateErrorRate(previous, correct)` is called for each question's category
**And** error rates are stored via `StorageService.setErrorRates()`
**And** stale question IDs in localStorage are silently ignored — no crash, no data loss (FR49)

**Given** `progressStore` loads from localStorage on app start
**When** stored error rates exist
**Then** they are restored correctly and used for the next session's weight calculations

**Given** `progressStore.recordAnswer(questionId, correct)` is called
**When** the weight update runs
**Then** the question's weight is recalculated via `calculateWeight()` and saved via `StorageService.setWeights()`
**And** no weight exceeds `MAX_WEIGHT` or falls below `MIN_WEIGHT`

---

### Story 4.3: Weighted Question Sampling in Sessions

As a **user**,
I want questions from my weak topics to appear more frequently in my sessions,
So that the app automatically focuses my practice where I need it most.

**Acceptance Criteria:**

**Given** a session is configured and started
**When** `useSessionSetup` samples questions
**Then** `sampleWeighted()` is called with current weights from `progressStore`
**And** questions from categories with high error rate appear proportionally more often
**And** questions from every selected category appear at least once if pool allows

**Given** a user has no prior progress data (first session)
**When** questions are sampled
**Then** all weights default to `1.0` and sampling is effectively uniform random

---

### Story 4.4: Daily Streak Tracking

As a **user**,
I want to see my daily usage streak,
So that I'm motivated to maintain my daily practice habit.

**Acceptance Criteria:**

**Given** the user completes a session
**When** the SummaryPage renders
**Then** the streak increments if today's date ≠ last session date
**And** the streak count is shown prominently in the summary ("Streak: 7 days")
**And** the streak data is saved via `StorageService.setStreak()`

**Given** the user skips one or more days
**When** the next session completes
**Then** the streak resets to 1
**And** the summary shows "Start a new streak today" — positive framing, no guilt message

**Given** the user completes multiple sessions in one day
**When** the streak is updated
**Then** the streak count does not increment more than once per calendar day

---

### Story 4.5: Session Timer & Personal Records

As a **user**,
I want to time my sessions and track my personal best for each configuration,
So that I can challenge myself to answer questions faster over time.

**Acceptance Criteria:**

**Given** the user enables the timer option in the configurator
**When** the first question renders
**Then** a timer starts and displays elapsed time in the question header (MM:SS format)

**Given** the session completes with timer active
**When** the SummaryPage renders
**Then** the total session duration is shown
**And** a record key is generated from the session config (categories + difficulty + mode + count)
**And** if no prior record: the time is saved as the new record via `StorageService.setRecord()`
**And** if the new time beats the prior record: a congratulation message is shown and the record is updated
**And** if the new time does not beat the record: the personal best is shown for reference

**Given** timer is not enabled
**When** the session runs
**Then** no timer UI is shown and no record is saved

---

### Story 4.6: Algorithm Transparency Widget

As a **user**,
I want to see which topics the algorithm recommends I focus on,
So that I can start my session with intention rather than picking categories blindly.

**Acceptance Criteria:**

**Given** the user has completed at least one prior session
**When** the home screen loads
**Then** the algorithm widget appears at the top of the SessionConfigurator showing up to 3 topics with the highest error rate
**And** each topic shows its error rate badge (e.g. "Closures 61%")
**And** tapping a topic pre-selects its category in the category grid

**Given** the user has no prior session data (first visit)
**When** the home screen loads
**Then** the algorithm widget is hidden — no empty state shown for it

**Given** a category's error rate is > 30%
**When** the category grid renders
**Then** a small error rate badge appears on that category chip (e.g. "React 48%")
**And** categories below 30% show no badge

---

## Epic 5: Content Administration

Admin can add, edit, and delete questions by modifying JSON files (manual or AI-agent path), add new categories without code changes, access a content contribution guide, run CI schema validation that blocks deployment on malformed content, and reset question weights per category or globally.

### Story 5.1: Content Contribution Guide

As an **admin**,
I want a documented guide for adding and editing questions,
So that I (and AI agents) can contribute content correctly without breaking the schema.

**Acceptance Criteria:**

**Given** `docs/content-guide.md` exists
**When** an admin reads it
**Then** it documents all 4 question type schemas with field descriptions and required/optional markers
**And** it includes a valid JSON example for each question type
**And** it describes the AI-agent path: prompt template for generating questions, review workflow, and file location
**And** it documents the manual path: how to edit a JSON file directly and what `npm run validate:data` checks
**And** it explains question ID naming conventions (e.g. `js-closure-001`) and why IDs must be stable

**Given** an AI agent is given the content guide
**When** it generates new questions
**Then** the output is valid JSON that passes `npm run validate:data` without modification

---

### Story 5.2: Add New Category Without Code Changes

As an **admin**,
I want to add a new question category by dropping a JSON file,
So that the app supports new topics without any application code changes.

**Acceptance Criteria:**

**Given** a new `public/data/<category-slug>.json` file is created following the schema
**When** `npm run validate:data` runs
**Then** the new file is discovered and validated automatically (no hardcoded file list)

**Given** the new JSON file passes validation and `npm run build` runs (which includes `build:manifest`)
**When** the SessionConfigurator loads
**Then** the new category appears in the category grid automatically — sourced from the regenerated `manifest.json`
**And** questions from the new category are available for selection
**And** no application source code was modified

**Given** the new category file is malformed
**When** `npm run validate:data` runs
**Then** it exits with code 1 and reports which file and field failed
**And** the CI pipeline blocks deployment

---

### Story 5.3: CI Schema Validation

As an **admin**,
I want JSON content validated automatically on every push,
So that malformed questions never reach production.

**Acceptance Criteria:**

**Given** `src/scripts/validate-data.ts` exists
**When** `npm run validate:data` runs
**Then** it discovers all `public/data/*.json` files dynamically
**And** validates each against the zod schemas from `src/lib/data/schema.ts`
**And** exits with code 0 if all files are valid
**And** exits with code 1 and prints the file path + field + error message for any violation

**Given** a push is made to any branch
**When** the `ci.yml` GitHub Actions workflow runs
**Then** `validate:data` runs as part of the pipeline (after `tsc --noEmit`, before `test`)
**And** a schema violation causes the entire pipeline to fail and blocks merging

---

### Story 5.4: Reset Question Weights

As an **admin**,
I want to reset adaptive question weights per category or for the entire pool,
So that I can recalibrate the algorithm when the question set changes significantly or I want a fresh start.

**Acceptance Criteria:**

**Given** the user accesses the weight reset option (accessible from home screen settings or summary page)
**When** "Reset weights for [category]" is selected
**Then** all question weights for that category are reset to `DEFAULT_WEIGHT: 1.0` via `StorageService.setWeights()`
**And** error rates for that category are reset to 0
**And** a confirmation is shown: "Weights reset for [category]"

**Given** the user selects "Reset all weights"
**When** the action is confirmed via a Dialog
**Then** all question weights and error rates across all categories are reset to defaults
**And** session records are preserved (not affected by weight reset)

**Given** weights are reset
**When** the next session starts
**Then** sampling uses default weights (uniform random) for the reset categories

---

## Epic 6: PWA, i18n, Theming & Analytics

App is installable to device home screen, works offline after first load, shows non-blocking update notifications, supports RU/EN language toggle and dark/light theme, tracks session engagement via Google Analytics, meets full WCAG AA accessibility, includes DevPlayground for component development, and runs on Vite 8 (Rolldown unified bundler).

### Story 6.1: Dark/Light Theme Toggle

As a **user**,
I want to toggle between dark and light themes,
So that I can use the app comfortably in different lighting conditions.

**Acceptance Criteria:**

**Given** the user opens the app for the first time
**When** the app loads
**Then** dark theme is active by default (`.dark` class on `<html>`)
**And** theme preference is loaded from `StorageService.getTheme()`

**Given** the user taps the theme toggle in `AppHeader`
**When** the toggle fires
**Then** `uiStore` updates theme and `StorageService.setTheme()` persists the value
**And** the `.dark` class is added/removed from `<html>` immediately
**And** all colour tokens switch to their light-mode overrides
**And** accent colour `#00ff87` contrast is verified at ≥ 4.5:1 against light background

**Given** the user reloads the app
**When** the app initialises
**Then** the previously selected theme is restored

---

### Story 6.2: RU/EN Language Toggle

As a **user**,
I want to switch the interface language between Russian and English,
So that I can use the app in my preferred language.

**Acceptance Criteria:**

**Given** the user opens the app for the first time
**When** the app loads
**Then** Russian (`ru`) is the active language and `document.documentElement.lang` is set to `"ru"`

**Given** the user taps the language toggle in `AppHeader`
**When** the toggle fires
**Then** `uiStore` updates language and `StorageService.setLanguage()` persists the value
**And** `i18next` switches to the selected locale immediately — no page reload
**And** `document.documentElement.lang` updates to `"en"` or `"ru"`
**And** all UI strings update via `t()` — no hardcoded text remains visible

**Given** any question is displayed in either language
**When** the question renders
**Then** code snippets always display in English regardless of active locale (FR51)
**And** technical identifiers (`useState`, `Promise`, CSS property names) remain in English in both locales

**Given** the user reloads the app
**When** the app initialises
**Then** the previously selected language is restored

---

### Story 6.3: PWA — Installable & Offline

As a **user**,
I want to install the app to my home screen and use it offline,
So that I can practice during my morning routine without needing a browser or internet connection.

**Acceptance Criteria:**

**Given** `vite-plugin-pwa` is configured in `vite.config.ts`
**When** the app is built
**Then** a service worker and PWA manifest are generated
**And** the manifest includes app name, icons (multiple sizes), theme colour, and `display: standalone`

**Given** the user visits the app on iOS Safari or Chrome Android
**When** the service worker registers on first load
**Then** the app shell and all `public/data/*.json` files are precached

**Given** the user has previously loaded the app and goes offline
**When** they open the app
**Then** the app loads from cache and all previously loaded question data is available
**And** the user can complete a full session without internet connection

**Given** the PWA install prompt is available after first session completes
**When** the prompt is shown
**Then** it appears as a non-intrusive bottom toast: "Add InterviewOS to your home screen"
**And** dismissing it does not show it again in the same session

---

### Story 6.4: PWA Update Notification

As a **user**,
I want to be notified when a new version of the app is available,
So that I can apply the update immediately without stale content persisting.

**Acceptance Criteria:**

**Given** a new version has been deployed (service worker detects changed precache manifest)
**When** the user opens the app
**Then** a non-blocking toast appears at the bottom: "New version available. Refresh?"
**And** the toast does not interrupt an active session

**Given** the user taps "Refresh" in the update toast
**When** `skipWaiting()` is called
**Then** the new service worker activates and the page reloads with the latest version

**Given** the user dismisses the toast
**When** dismissal occurs
**Then** the current session continues uninterrupted
**And** the toast does not reappear until the next app open

---

### Story 6.5: Google Analytics Integration

As a **developer**,
I want session engagement events tracked via Google Analytics,
So that I can measure usage patterns and identify which categories and modes are most popular.

**Acceptance Criteria:**

**Given** `src/lib/analytics/index.ts` exports a `track()` function
**When** any component calls `track()`
**Then** no direct `gtag()` calls exist outside `src/lib/analytics/`

**Given** a user starts a session
**When** `session_start` fires
**Then** GA receives: `{ categories, difficulty, mode, count }`

**Given** a user answers a question
**When** `question_answered` fires
**Then** GA receives: `{ category, difficulty, type, correct, timeMs }`

**Given** a user completes or abandons a session
**When** `session_complete` or `session_abandoned` fires
**Then** GA receives the correct payload as defined in `src/lib/analytics/events.ts`
**And** all 11 event types from the analytics taxonomy are implemented

---

### Story 6.6: Full Accessibility Audit & Keyboard Navigation

As a **user**,
I want to navigate the entire app with a keyboard and have screen reader support,
So that the app is usable without a mouse and meets WCAG AA standards.

**Acceptance Criteria:**

**Given** the user navigates with Tab/Shift+Tab
**When** focus moves between interactive elements
**Then** every focusable element shows a visible focus ring: `outline-2 outline-accent-alt outline-offset-2`
**And** focus order is logical and matches visual reading order

**Given** the user is on the question page using keyboard only
**When** keys 1–4 are pressed
**Then** the corresponding answer option is selected; Enter confirms/advances; Space toggles checkboxes for multi-choice

**Given** a skip link is present in `AppShell`
**When** a keyboard user activates it
**Then** focus jumps directly to `#main-content`

**Given** `axe-core` runs in CI via Vitest
**When** all component tests execute
**Then** zero accessibility violations are reported for all rendered components

---

### Story 6.7: Vite 8 Migration

As a **developer**,
I want the project migrated from Vite 7 to Vite 8,
So that the app benefits from the Rolldown unified bundler with significantly faster build times.

**Acceptance Criteria:**

**Given** `package.json` is updated to `vite@^8.0.1`
**When** `npm install` runs
**Then** no peer dependency conflicts exist and Node.js version meets 20.19+ or 22.12+

**Given** `vite.config.ts` is updated for Vite 8
**When** `npm run dev` starts
**Then** the dev server starts without errors and HMR works correctly for `.tsx`, `.ts`, and `.css` files

**Given** `npm run build` runs
**When** the build completes
**Then** `dist/` is generated without errors
**And** `vite-plugin-pwa` generates the service worker and manifest correctly
**And** bundle size is equal to or smaller than the Vite 7 baseline

**Given** the full CI pipeline runs after migration
**When** all steps execute
**Then** `lint` → `tsc --noEmit` → `validate:data` → `test` → `build` all pass
