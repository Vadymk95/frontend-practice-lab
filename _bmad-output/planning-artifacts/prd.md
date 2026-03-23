---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
completedAt: '2026-03-22'
inputDocuments: []
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - InterviewOS

**Author:** Vadym
**Date:** 2026-03-21

## Executive Summary

A personal, mobile-first interview preparation SPA for frontend engineers. Designed as a daily habit tool (1-hour sessions) to combat cognitive atrophy caused by AI-assisted development workflows. The product serves a senior frontend engineer who executes at a high level autonomously but needs continuous reinforcement of theoretical fundamentals — from trainee-level basics to principal/staff engineer depth — to remain competitive in the job market targeting $7–10k/mo net compensation.

The target user is not a student preparing for their first job. They are a working lead who has offloaded most coding to AI tools, understands systems intuitively, but cannot reliably recall the *why* behind decisions when asked directly in interview settings.

### What Makes This Special

Existing tools (LeetCode, Quizlet, Frontend Mentor) are overloaded, generic, and optimized for one-time cramming. This tool is:

- **Adaptive** — tracks per-topic error rates and surfaces weak areas more frequently; reduces but never eliminates strong areas (spaced repetition logic)
- **Session-configurable** — user controls mode (quiz / bug finding / code completion), difficulty (easy / medium / hard), and topic scope per session
- **Mobile-first** — primary use case is morning sessions from a phone in bed; single-thumb navigation
- **Minimalist** — zero cognitive overhead from UI; the mental effort goes entirely to the questions
- **Scalable to public** — data layer abstracted from day one; JSON-local for v1, Firebase-ready for v2 when multi-user or sync is needed

## Project Classification

- **Project Type:** Web Application (SPA)
- **Domain:** General / Personal Productivity (edtech-adjacent)
- **Complexity:** Medium — adaptive logic, multi-category content system, scalable data architecture
- **Project Context:** Greenfield
- **Deployment:** Static hosting (GitHub Pages / Firebase Hosting); v1 data in local JSON files

## Success Criteria

### User Success

- User completes at least one session per day for 30 consecutive days (habit formation indicator)
- User can answer questions faster and with higher accuracy over time (tracked via adaptive error rate decline per topic)
- User feels confident in both theoretical and practical frontend interview questions at senior/lead level
- User can complete mini React coding tasks within a session without external help
- Session completion rate > 80%

### Business Success

**3-month (personal):** Tool solves the creator's own interview prep problem — used daily, knowledge gaps measurably reduced

**6-month (semi-public):** Shared with colleagues; qualitative feedback received; Google Analytics shows returning users and session engagement

**12-month (public):** LinkedIn-driven organic traffic; feedback channel in place; monetization path evaluated

### Technical Success

- Initial JSON load completes in < 2s on a 4G mobile connection (loader shown during fetch)
- App is fully usable on mobile (single-thumb navigation, no horizontal scroll)
- Data layer fully decoupled from UI — Firebase migration requires zero UI changes
- New question category added by dropping a JSON file — zero code changes required
- Google Analytics integrated from v1

### Measurable Outcomes

- Adaptive algorithm increases frequency for topics with > 40% error rate
- Adaptive algorithm decreases (never removes) topics with < 15% error rate

## Product Scope

### MVP — Minimum Viable Product

**Modes:**
- Quiz — single choice (instant reveal) and multiple choice (Check button)
- Bug Finding — code snippet with syntax highlighting, answer via options or short text input
- Code Completion — fill-in-the-blank code snippets, validated by case-insensitive string comparison

**Session configurator:** category multi-select, difficulty (easy / medium / hard), mode, question count limit, order (random / sequential)

**Categories (17):**
`HTML` · `CSS` · `Browser Internals` · `JavaScript` · `TypeScript` · `React` · `Next.js` · `Architecture & Patterns` · `Build Tools` · `Performance` · `Security` · `API & Backend for Frontend` · `Feature Flags` · `Git` · `Testing` · `Team Lead & Processes` · `Best Practices`

**Adaptive logic:** per-topic error rate tracking, weighted question frequency

**Infrastructure:** local JSON data files (one per category), mobile-first UI, Google Analytics, loader on fetch

### Growth Features (Post-MVP)

- Code Ordering mode (drag-and-drop line reordering, requires `dnd-kit`)
- Full live coding editor (Monaco/CodeMirror with auto-validation sandbox)
- Algorithms category
- Progress dashboard (per-topic error rate charts over time)
- User feedback widget
- Firebase migration (multi-device sync, optional user accounts)

### Vision (Future)

- Public platform with community-contributed questions
- Monetization (premium categories, question packs)
- Spaced repetition scheduling (SRS / Anki-style)
- LinkedIn share cards

## User Journeys

### Journey 1: Vadym — Daily Learning Session (Primary, Happy Path)

It's 8:15 AM. Vadym reaches for his phone before getting out of bed. He opens the app, taps "Start Session". He selects **JavaScript + TypeScript**, difficulty **medium**, mode **quiz**. The system shows "235 questions available". He sets a limit of 50, order random. A spinner appears briefly as JSON loads, then 50 questions are ready — a weighted random sample across the two categories.

Question 3: "What is the output of this closure?" — he taps option A. Immediately the choice locks, option A turns red, the correct option turns green, and an explanation appears: why the answer is what it is, what to remember. He taps "Next".

After all 50 questions he sees a summary: 38/50, weakest area — closures and TypeScript generics. The adaptive engine silently increases the weight for those topics. Tomorrow morning, they appear more often. Within two weeks his error rate on closures drops from 60% to 20%.

**Capabilities revealed:** session configurator (category multi-select, difficulty, mode, question count, order), available question count display, weighted random sampling, single-choice instant reveal, explanation always shown, post-session summary, adaptive error tracking.

---

### Journey 2: Vadym — Targeted Pre-Interview Session (Primary, Edge Case)

Three days before a promising interview. Vadym opens the app on desktop. He selects **React + TypeScript + Architecture & Patterns + Feature Flags**, difficulty **hard**, all modes. He sets 30 questions, ordered by difficulty.

He hits a multiple-choice question — selects three options, taps "Check" — two correct, one wrong. Explanation appears. He hits a bug-finding task, spots the issue, taps "Submit", compares his answer to the reference solution, taps "Missed it". He finishes the session — 18/30. Architecture patterns are red.

He taps "Repeat mistakes only" — the app loads exactly the 12 questions he got wrong. He goes through them again with fresh context from the explanations. He feels ready.

**Capabilities revealed:** multi-category selection, multi-choice "Check" button flow, live coding / bug finding "Submit" + self-assessment flow (Got it / Missed it), reference solution display, "repeat mistakes" mode, per-session weak zone highlight.

---

### Journey 3: Colleague — First Visit via Shared Link

Vadym posts in the team Slack: "built this, try it". A colleague opens the link on desktop, lands on the home screen. No login, no onboarding — just a category grid and a "Start" button. They pick **CSS + HTML**, easy, quiz, 10 questions. Clean, fast, no friction. They bookmark it.

They have no ability to add, edit, or delete content. Everything is read-only. No account required to use the app.

**Capabilities revealed:** zero-auth read-only access, frictionless first-visit UX, no registration wall.

---

### Journey 4: Vadym — Content Admin (Manual + AI-Assisted)

Vadym reads a great article on feature flag architecture and wants to add 10 new questions.

**AI-agent path (preferred):** He opens a conversation with an AI agent: *"Add 5 hard questions about feature flag cleanup patterns to feature-flags category"*. The agent reads `docs/content-guide.md`, generates valid JSON following the strict schema (`id`, `question`, `type`, `options`, `correct`, `difficulty`, `tags`, `explanation`), appends them to `src/data/feature-flags.json`. Vadym reviews the diff, approves. CI validates the schema. Done.

**Manual path:** He opens `src/data/feature-flags.json` directly, follows the schema documented in `docs/content-guide.md`, adds entries, saves. CI schema validation runs on push and catches any malformed entries.

All content mutation is gated by repo access. In v1, no other user can modify data. A future `/admin` route protected by an env token is possible but not required for MVP.

**Capabilities revealed:** strict JSON schema per question type, `docs/content-guide.md` with contribution patterns, CI schema validation, AI-agent-friendly data structure, admin-only content gate via repo access.

---

### Journey Requirements Summary

| Capability | Revealed By |
|---|---|
| Session configurator (category multi-select, difficulty, mode, count, order) | Journey 1, 2 |
| Available question count display + weighted random sampling | Journey 1 |
| Single-choice instant reveal (no button) | Journey 1 |
| Multi-choice "Check" button flow | Journey 2 |
| Live coding / bug finding "Submit" + self-assessment (Got it / Missed it) | Journey 2 |
| Explanation always shown after answer (all question types) | Journey 1, 2 |
| Reference solution display for practical tasks | Journey 2 |
| Post-session summary + weak zone highlight | Journey 1, 2 |
| "Repeat mistakes only" mode | Journey 2 |
| Adaptive error rate tracking + weighted question frequency | Journey 1 |
| Zero-auth read-only access | Journey 3 |
| Frictionless first-visit UX | Journey 3 |
| Strict JSON schema + `docs/content-guide.md` | Journey 4 |
| AI-agent-friendly data structure | Journey 4 |
| CI schema validation | Journey 4 |
| Admin content gate (repo access / env token) | Journey 4 |

## Web App Specific Requirements

### Project-Type Overview

Single Page Application (SPA) built with React 19 + Vite. No server-side rendering required — purely client-side, deployable as static files. Primary interaction surface is mobile (touch), secondary is desktop.

### Technical Architecture Considerations

**Browser Support:**
- Target: last 2 major versions of Chrome, Safari, Firefox, Edge
- Mobile: Chrome for Android, Safari for iOS (primary)
- Polyfills: none required — Vite + modern stack handles compatibility

**Responsive Design:**
- Mobile-first breakpoints
- Single-thumb navigation on mobile: tap targets ≥ 44px, no horizontal scroll, readable at 16px base font
- Desktop layout enhances the experience but is not the primary design target

**PWA (Progressive Web App):**
- Implemented via `vite-plugin-pwa`
- Service worker caches JSON data files and app shell on first load
- Installable to home screen on iOS and Android
- Offline mode: previously loaded sessions available without internet
- Fast repeat launches — no network round-trip after first load
- **Update flow:** on new deployment, SW detects changed file hashes (precache manifest), shows update toast ("New version available. Refresh?"), calls `skipWaiting()` on confirm — user gets new version immediately. No stale version persists beyond one session.

**SEO:**
- Not required — personal tool, no public indexing needed
- `robots.txt` set to disallow crawling in v1

**Accessibility:**
- WCAG AA compliance as baseline — leveraged from shadcn/ui defaults
- Minimum contrast ratio 4.5:1 for text
- Keyboard navigation supported (desktop use case)
- `focus-visible` states on all interactive elements
- No accessibility-breaking customisations to shadcn/ui components

### Implementation Considerations

- All routes client-side (React Router 7)
- No SSR, no API routes — pure static output from `vite build`
- Deploy target: static hosting (GitHub Pages or Firebase Hosting)
- PWA manifest and service worker generated at build time via `vite-plugin-pwa`
- JSON data files versioned with build (content-hashed filenames)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — minimum viable tool that keeps the brain sharp daily. No platform ambitions in v1. Build for one user (the creator), solve one problem (cognitive atrophy from AI-heavy workflow).

**Resource:** Solo developer, no deadlines, no team dependencies.

### MVP Feature Set (Phase 1)

**Question Modes:**
- Quiz — single choice (instant reveal) and multiple choice (Check button)
- Bug Finding — code snippet displayed with syntax highlighting, answer via options or short text input
- Code Completion — fill-in-the-blank code snippets, answer via text input, validated by string comparison

**Session Configurator:**
- Multi-category selection with total available question count shown
- Difficulty filter: easy / medium / hard
- Mode filter: quiz / bug finding / code completion / all
- Question count limit (e.g. pick 50 from 235 available — weighted random sample)
- Order: random or sequential

**Answer Flow:**
- All types: explanation always shown after answer regardless of correctness
- Single choice: instant reveal on tap (no button)
- Multiple choice: "Check" button after selection
- Bug finding / Code completion: "Submit" button, then reveal + reference answer

**Post-Session:**
- Summary: score, weak topics highlighted
- "Repeat mistakes" mode — re-runs only wrong answers from current session

**Adaptive Algorithm:**
- Per-topic error rate tracked in localStorage
- Topics with > 40% error rate surface more frequently
- Topics with < 15% error rate surface less frequently (never removed)

**Categories (17):** HTML · CSS · Browser Internals · JavaScript · TypeScript · React · Next.js · Architecture & Patterns · Build Tools · Performance · Security · API & Backend for Frontend · Feature Flags · Git · Testing · Team Lead & Processes · Best Practices

**Infrastructure:**
- Local JSON data files (one per category), strict schema
- `docs/content-guide.md` for admin content management
- PWA (installable, offline-capable, auto-update toast)
- Google Analytics (session tracking, category engagement)
- Mobile-first responsive UI

### Phase 2 — Growth (Post-MVP)

- Code Ordering mode (drag-and-drop line reordering, requires `dnd-kit`)
- Full live coding editor (Monaco/CodeMirror with auto-validation sandbox)
- Progress dashboard (per-topic error rate charts over time)
- User feedback widget
- Firebase migration (multi-device sync, optional user accounts)
- Algorithms category

### Phase 3 — Vision (Future)

- Public platform with community-contributed questions
- Monetization (premium question packs)
- SRS scheduling (Anki-style spaced repetition)
- LinkedIn share cards ("scored X on React today")

### Risk Mitigation

**Technical:** Adaptive algorithm = weighted random sampling (~20 lines). No ML, no backend. Zero risk.
**Scope creep:** If a feature requires a new dependency or >1 day of work — defer to Phase 2.
**Firebase:** Optional. JSON + static hosting works indefinitely for personal use. Migrate only if multi-device sync becomes a real need.

## Functional Requirements

### Session Management

- FR1: User can configure a session by selecting one or more question categories
- FR2: User can filter session questions by difficulty level (easy, medium, hard)
- FR3: User can filter session questions by mode (quiz, bug finding, code completion, or all)
- FR4: User can set a maximum question count for a session
- FR5: User can see the total number of available questions matching their selection before starting
- FR6: User can choose question order (random or sequential)
- FR7: User can start a session with a weighted-random sampled subset of questions
- FR8: User can repeat only the incorrectly answered questions from a completed session
- FR41: User can skip a question and immediately see the correct answer and explanation
- FR42: At session end, user can choose to review: failed only / skipped only / both / restart full session
- FR43: User can delete individual saved session presets
- FR44: User can reset question weights per category or for the entire pool
- FR39: User can save a session configuration as a preset and relaunch it
- FR40: User can preview available question counts per category and difficulty breakdown before starting a session

### Question Answering

- FR9: User can answer a single-choice question and receive instant result without confirming
- FR10: User can answer a multiple-choice question and submit selection for evaluation
- FR11: User can answer a bug-finding question by selecting from options or entering short text
- FR12: User can answer a code-completion question by filling in one or more blanks in a code snippet
- FR13: User can submit a code-completion or bug-finding answer and see a reference solution
- FR14: User always sees an explanation after answering regardless of correctness
- FR15: User can see syntax-highlighted code in bug-finding and code-completion questions
- FR45: Code completion answer validation is case-insensitive and ignores leading/trailing whitespace
- FR46: Code snippets are displayed in a mobile-optimised scrollable container

### Progress & Adaptation

- FR16: System tracks per-topic error rate across sessions
- FR17: System increases question frequency for topics with high error rate
- FR18: System decreases (but never eliminates) question frequency for topics with low error rate
- FR19: User can view a post-session summary showing score and weakest topics
- FR20: User's progress data persists between sessions via localStorage
- FR33: System maintains a persistent weight per question across sessions
- FR34: System samples questions using weighted random selection
- FR35: Questions are never removed from the pool regardless of mastery level
- FR47: System tracks and displays daily usage streak
- FR48: Question weight has a maximum cap; algorithm constants are externalised in a config object for easy calibration; core algorithm logic is covered by unit tests
- FR49: System gracefully ignores stored weights for question IDs that no longer exist in data

### Timer & Records

- FR36: User can start a session with an optional timer
- FR37: System records the fastest completion time per unique session configuration
- FR38: User is congratulated and a new record is saved when beating the previous best time

### Theming

- FR32: User can toggle between light and dark theme; preference persists across sessions; default is dark
- FR50: User can switch the interface language between Russian and English; preference persists across sessions; default is Russian
- FR51: Code snippets are always displayed in English regardless of the active interface language

### Content & Categories

- FR21: System loads question data from structured JSON files at session start
- FR22: System supports 17 question categories in MVP
- FR23: Admin can add, edit, or delete questions by modifying JSON data files
- FR24: Admin can add a new category without modifying application code
- FR25: System validates JSON content structure at build time via CI schema check
- FR26: Admin has access to a content contribution guide documenting schema and patterns

### Application & Access

- FR27: User can access the application without authentication or registration
- FR28: User can install the application to their device home screen (PWA)
- FR29: User can use the application offline after initial load (cached content)
- FR30: User is notified when a new version is available and can apply the update immediately
- FR31: System tracks session engagement events via analytics

## Non-Functional Requirements

### Performance

- Initial app shell loads in < 2s on 4G mobile (FCP)
- JSON data fetch completes in < 2s on 4G mobile; loader shown during fetch
- All UI interactions (answer reveal, navigation) respond in < 100ms
- No blocking renders — app shell displays before data is available

### Accessibility

- WCAG AA compliance as baseline (contrast ratio 4.5:1, focus-visible, keyboard navigation)
- Tap targets ≥ 44×44px on mobile
- Font size minimum 16px for question text; 14px for secondary UI
- No content relies solely on colour to convey meaning (correct/wrong uses icon or text in addition to colour)

### Reliability

- Adaptive algorithm must not produce infinite loops, weight overflow, or NaN values
- Algorithm constants (weight multipliers, cap values) externalised in a single config object
- Core algorithm logic covered by unit tests; any change to constants triggers test re-run
- Stale question IDs in localStorage are silently ignored — no crash, no data loss

### Maintainability

- New question category deployable by adding one JSON file — zero application code changes required
- JSON schema validated at build time; malformed content blocks deployment
- Storage layer (localStorage reads/writes) encapsulated behind a single service — swappable for Firebase without UI changes

## Localisation

- Default language: **Russian** — all questions, answers, explanations, and UI strings
- Language toggle: RU / EN — single control, persists via localStorage
- Code snippets always rendered in English regardless of active language
- Technical identifiers (useState, Promise, async/await, CSS property names) remain in English in both languages
- i18n implemented via `i18next` (already in stack); all user-visible strings go through `t()` — no hardcoded text in components
- Adding a third language requires only a new translation file — zero code changes

## Design System & Visual Identity

### Visual Direction

Retro programmer aesthetic — terminal-inspired, precise, high-contrast. Think Linear / Vercel Dashboard meets old-school monospace terminal. Dark by default. Strict, tasteful, built for focus.

**Not:** Playful, rounded, colorful, gamified.
**Yes:** Sharp, monospace, minimal color palette, pixel-perfect spacing.

### Typography

- **Primary font:** JetBrains Mono or Fira Code (monospace) — used for UI labels, buttons, headings
- **Question/body text:** system sans-serif fallback for readability at scale (or same monospace at comfortable size)
- **Code snippets:** monospace, syntax-highlighted, distinct background
- **Minimum sizes:** 16px question text, 14px secondary UI, 12px metadata

### Colour Palette

- Base: near-black background (`#0d0d0d` or `#111`)
- Surface: dark grey cards (`#1a1a1a` / `#1e1e1e`)
- Accent: single colour — terminal green (`#00ff87`) or electric blue (`#3b82f6`) — used sparingly for active states, correct answers, CTAs
- Error: red (`#ef4444`)
- Text: off-white (`#e5e5e5`) primary, muted grey secondary
- Borders: subtle (`#2a2a2a`), no soft shadows — sharp edges only

### Spacing & Grid

- 8px base grid — all spacing is multiples of 8px
- Consistent padding: 16px mobile, 24px tablet, 32px desktop
- No arbitrary spacing — every margin/padding is intentional and grid-aligned

### Responsive Breakpoints

- **Mobile:** < 768px — single column, thumb-zone actions at bottom, no hover states
- **Tablet:** 768–1023px — wider content area, side padding increases
- **Desktop:** ≥ 1024px — centred max-width container (760px for reading, 1200px for layout), comfortable line lengths

### UX Layout Principles

- **Mobile:** primary actions (Next, Check, Submit) anchored to bottom of viewport — reachable with one thumb
- **Question card:** full-width, adequate line height (1.6), code blocks scrollable horizontally
- **Answer options:** full-width tap targets, minimum 52px height on mobile
- **Post-session summary:** scannable — score prominent, weak topics listed clearly, next action obvious
- **Navigation:** minimal — app bar with logo + language toggle + theme toggle only; no sidebar, no complex nav
- All interactive states: clear `focus-visible`, active press state, disabled state — no ambiguity
