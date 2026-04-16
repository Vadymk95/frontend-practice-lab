# Story 6.5: Google Analytics Integration

Status: review

## Story

As a **developer**,
I want session engagement events tracked via Google Analytics,
so that I can measure usage patterns and identify which categories and modes are most popular.

## Acceptance Criteria

1. **Given** `src/lib/analytics/index.ts` exports a `track()` function
   **When** any component calls `track()`
   **Then** no direct `gtag()` calls exist outside `src/lib/analytics/`

2. **Given** a user starts a session
   **When** `session_start` fires
   **Then** GA receives: `{ categories, difficulty, mode, count }`

3. **Given** a user answers a question
   **When** `question_answered` fires
   **Then** GA receives: `{ category, difficulty, type, correct, timeMs }`

4. **Given** a user completes or abandons a session
   **When** `session_complete` or `session_abandoned` fires
   **Then** GA receives the correct payload as defined in `src/lib/analytics/events.ts`
   **And** all 11 event types from the analytics taxonomy are implemented

## Tasks / Subtasks

- [x] Task 1: Create analytics module (AC: #1, #4)
  - [x] Create `src/lib/analytics/events.ts` — event name constants + payload types
  - [x] Create `src/lib/analytics/index.ts` — `track()` function wrapping `window.gtag`
  - [x] Add `gtag` type declaration to avoid TypeScript errors

- [x] Task 2: Create `useAnalytics` convenience hook (AC: #1)
  - [x] Create `src/hooks/analytics/useAnalytics.ts` — thin re-export of `track`
  - [x] No logic — just `return { track }`

- [x] Task 3: Inject GA script in `index.html` (AC: #1, #2, #3, #4)
  - [x] Add Google Analytics gtag.js script tag to `index.html`
  - [x] Use environment variable `VITE_GA_ID` for the Measurement ID
  - [x] Add `VITE_GA_ID=` to `.env.example` with empty value

- [x] Task 4: Wire `session_start` event (AC: #2)
  - [x] Call `track('session_start', { categories, difficulty, mode, count })` when session begins
  - [x] Location: `src/hooks/session/useSessionSetup.ts` after `setQuestionList(ordered)`

- [x] Task 5: Wire `question_answered` event (AC: #3)
  - [x] Call `track('question_answered', { category, difficulty, type, correct, timeMs })` on answer submit
  - [x] Location: all 4 question answer hooks (single-choice, multi-choice, bug-finding, code-completion)

- [x] Task 6: Wire remaining 9 events (AC: #4)
  - [x] `session_complete` — in `useSummaryPage.ts` mount effect with score/total/durationMs/weakCategories
  - [x] `session_abandoned` — cleanup effect in `useSessionPlayPage.ts` on unmount without completion
  - [x] `repeat_mistakes_start` — in all three repeat handlers in `useSummaryPage.ts`
  - [x] `preset_saved` — in `presetStore.savePreset()`
  - [x] `preset_loaded` — in `presetStore.updateLastUsed()` (called on preset launch)
  - [x] `language_changed` — in `useAppHeader.handleLanguageToggle()`
  - [x] `theme_changed` — in `useAppHeader.handleThemeToggle()` (new handler replacing inline lambda)
  - [x] `pwa_install_prompt` — in `usePwaInstallToast` when `setIsVisible(true)` fires
  - [x] `pwa_update_applied` — in `usePwaUpdateToast.handleUpdate()` before `updateServiceWorker`

- [x] Task 7: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### Full Events Taxonomy — All 11 Events

From `architecture.md` Analytics Events section:

```typescript
// src/lib/analytics/events.ts

import type { QuestionType } from '@/lib/data/schema';

export const ANALYTICS_EVENTS = {
    SESSION_START: 'session_start',
    QUESTION_ANSWERED: 'question_answered',
    SESSION_COMPLETE: 'session_complete',
    SESSION_ABANDONED: 'session_abandoned',
    REPEAT_MISTAKES_START: 'repeat_mistakes_start',
    PRESET_SAVED: 'preset_saved',
    PRESET_LOADED: 'preset_loaded',
    LANGUAGE_CHANGED: 'language_changed',
    THEME_CHANGED: 'theme_changed',
    PWA_INSTALL_PROMPT: 'pwa_install_prompt',
    PWA_UPDATE_APPLIED: 'pwa_update_applied',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsEventPayloads {
    session_start: { categories: string[]; difficulty: string; mode: string; count: number };
    question_answered: { category: string; difficulty: string; type: QuestionType; correct: boolean; timeMs: number };
    session_complete: { score: number; total: number; durationMs: number; weakCategories: string[] };
    session_abandoned: { answered: number; total: number };
    repeat_mistakes_start: { count: number };
    preset_saved: Record<string, never>;
    preset_loaded: Record<string, never>;
    language_changed: { to: 'ru' | 'en' };
    theme_changed: { to: 'dark' | 'light' };
    pwa_install_prompt: Record<string, never>;
    pwa_update_applied: Record<string, never>;
}
```

### track() Implementation

```typescript
// src/lib/analytics/index.ts

import type { AnalyticsEventName, AnalyticsEventPayloads } from './events';

declare global {
    interface Window {
        gtag?: (command: 'event', eventName: string, params?: Record<string, unknown>) => void;
    }
}

export const track = <T extends AnalyticsEventName>(
    event: T,
    params?: AnalyticsEventPayloads[T]
): void => {
    window.gtag?.('event', event, params as Record<string, unknown>);
};
```

`window.gtag?.` — optional chaining ensures no crash if GA script fails to load or is blocked by ad-blocker.

### useAnalytics Hook — Thin Wrapper

```typescript
// src/hooks/analytics/useAnalytics.ts
import { track } from '@/lib/analytics';

export const useAnalytics = () => ({ track });
```

This is a convenience for components that need to destructure from a hook. Stores and utilities call `track()` directly (no hook context needed).

### GA Script in index.html

```html
<!-- index.html — in <head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=%VITE_GA_ID%"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '%VITE_GA_ID%');
</script>
```

Vite replaces `%VITE_GA_ID%` with the env variable at build time. If `VITE_GA_ID` is empty (dev), GA loads with empty ID — no real tracking, no errors.

Add to `.env.example`:
```
VITE_GA_ID=G-XXXXXXXXXX
```

### Event Call Locations

Find existing call sites by searching for store actions and hooks:

| Event | File | Action/Hook |
|-------|------|-------------|
| `session_start` | `src/store/session/sessionStore.ts` | `startSession()` action |
| `question_answered` | session store or question answer hook | `answerQuestion()` |
| `session_complete` | `src/store/session/sessionStore.ts` | `endSession()` |
| `session_abandoned` | session store or back navigation | `abandonSession()` or router guard |
| `repeat_mistakes_start` | `src/pages/SummaryPage/` | "Retry wrong" button handler |
| `preset_saved` | `src/store/presets/presetStore.ts` | `savePreset()` |
| `preset_loaded` | `src/store/presets/presetStore.ts` | `loadPreset()` |
| `language_changed` | AppHeader toggle or `uiStore.setLanguage()` | toggle handler |
| `theme_changed` | AppHeader toggle or `uiStore.setTheme()` | toggle handler |

**Search each store file before adding call.** Don't duplicate existing calls.

### No Test Coverage Required for track()

`track()` is a pure pass-through to `window.gtag`. Testing it requires mocking `window.gtag`. Skip unit tests for the `track()` function itself — it's too trivial. The `events.ts` types are compile-time checked.

`useAnalytics` hook has zero logic — skip tests per TDD exceptions rule (trivial hook).

### TypeScript Strict Mode Compliance

`AnalyticsEventPayloads[T]` type mapping ensures payload types are checked at compile time. If you add `track('session_start', { wrong: true })`, TypeScript will error. This prevents bugs in event calls.

### Architecture Compliance Checklist

- No `gtag()` calls outside `src/lib/analytics/index.ts`
- `track()` is a plain function (not a hook) — callable from stores and utilities
- `window.gtag?.` optional chaining — handles ad-blockers gracefully
- `VITE_GA_ID` env variable — never hardcode the GA ID in source
- Named exports only

### References

- `_bmad-output/planning-artifacts/architecture.md` — §Analytics Events (full taxonomy)
- `src/store/session/sessionStore.ts` — event wiring locations
- `src/store/presets/presetStore.ts` — `preset_saved`, `preset_loaded`
- `src/components/layout/AppHeader/AppHeader.tsx` — `language_changed`, `theme_changed`
- `src/lib/data/schema.ts` — `QuestionType` enum/union for `question_answered` payload
- Story 6.3 (`6-3-pwa-installable-offline.md`) — `pwa_install_prompt` event
- Story 6.4 (`6-4-pwa-update-notification.md`) — `pwa_update_applied` event

## Dev Agent Record

### Completion Notes

- Created `src/lib/analytics/events.ts` with all 11 event constants and TypeScript payload types.
- Created `src/lib/analytics/index.ts` with `track()` function using `window.gtag?.` optional chaining (ad-blocker safe). Added global `Window.gtag` type declaration.
- Created `src/hooks/analytics/useAnalytics.ts` as a thin `{ track }` re-export hook.
- Added GA script tags to `index.html` using `%VITE_GA_ID%` Vite env substitution. Added `VITE_GA_ID=G-XXXXXXXXXX` to `.env.example`.
- Exported `useSessionStoreBase` from `src/store/session/index.ts` to enable imperative `getState().timerMs` access in question hooks without React subscription overhead.
- `session_start` fires in `useSessionSetup.ts` after `setQuestionList(ordered)` with actual sampled count.
- `question_answered` fires in all 4 question hooks (single-choice, multi-choice, bug-finding, code-completion) using `useSessionStoreBase.getState().timerMs` for the timeMs field.
- `session_complete` fires in `useSummaryPage.ts` mount effect alongside `saveSessionResults`. Added `weakTopicsRef` to capture the useMemo value for the mount-only effect.
- `session_abandoned` fires in `useSessionPlayPage.ts` cleanup effect on unmount. A `sessionCompletedRef` is set to `true` before navigating to summary — prevents double-firing when session completes normally.
- `repeat_mistakes_start` fires in all three repeat handlers in `useSummaryPage.ts`.
- `preset_saved` and `preset_loaded` fire inside `presetStore.ts` actions — `savePreset()` and `updateLastUsed()` respectively.
- `language_changed` fires in `useAppHeader.handleLanguageToggle()`. `theme_changed` fires in new `handleThemeToggle()` handler; `AppHeader.tsx` updated to use it instead of inline lambda.
- `pwa_install_prompt` fires in `usePwaInstallToast.ts` when the install prompt becomes visible.
- `pwa_update_applied` fires in `usePwaUpdateToast.handleUpdate()` before calling `updateServiceWorker`.
- All 31 test files (281 tests) pass. No test changes needed — `window.gtag?.` optional chaining means `track()` is a no-op in test env.

### File List

- `src/lib/analytics/events.ts` (new)
- `src/lib/analytics/index.ts` (new)
- `src/hooks/analytics/useAnalytics.ts` (new)
- `index.html` (modified — GA script tags)
- `.env.example` (modified — VITE_GA_ID)
- `src/store/session/index.ts` (modified — export useSessionStoreBase)
- `src/hooks/session/useSessionSetup.ts` (modified — session_start)
- `src/components/features/QuestionCard/SingleChoice/useSingleChoiceQuestion.ts` (modified — question_answered)
- `src/components/features/QuestionCard/MultiChoice/useMultiChoiceQuestion.ts` (modified — question_answered)
- `src/components/features/QuestionCard/BugFinding/useBugFindingQuestion.ts` (modified — question_answered)
- `src/components/features/QuestionCard/CodeCompletion/useCodeCompletionQuestion.ts` (modified — question_answered)
- `src/pages/SessionPlayPage/useSessionPlayPage.ts` (modified — session_abandoned)
- `src/pages/SummaryPage/useSummaryPage.ts` (modified — session_complete, repeat_mistakes_start)
- `src/store/presets/presetStore.ts` (modified — preset_saved, preset_loaded)
- `src/components/layout/AppHeader/useAppHeader.ts` (modified — language_changed, theme_changed, handleThemeToggle)
- `src/components/layout/AppHeader/AppHeader.tsx` (modified — use handleThemeToggle)
- `src/components/common/PwaInstallToast/usePwaInstallToast.ts` (modified — pwa_install_prompt)
- `src/components/common/PwaUpdateToast/usePwaUpdateToast.ts` (modified — pwa_update_applied)

### Change Log

- feat(analytics): implement Google Analytics integration with 11-event taxonomy (2026-04-16)
