# Story 6.5: Google Analytics Integration

Status: ready-for-dev

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

- [ ] Task 1: Create analytics module (AC: #1, #4)
  - [ ] Create `src/lib/analytics/events.ts` — event name constants + payload types
  - [ ] Create `src/lib/analytics/index.ts` — `track()` function wrapping `window.gtag`
  - [ ] Add `gtag` type declaration to avoid TypeScript errors

- [ ] Task 2: Create `useAnalytics` convenience hook (AC: #1)
  - [ ] Create `src/hooks/analytics/useAnalytics.ts` — thin re-export of `track`
  - [ ] No logic — just `return { track }`

- [ ] Task 3: Inject GA script in `index.html` (AC: #1, #2, #3, #4)
  - [ ] Add Google Analytics gtag.js script tag to `index.html`
  - [ ] Use environment variable `VITE_GA_ID` for the Measurement ID
  - [ ] Add `VITE_GA_ID=` to `.env.example` with empty value

- [ ] Task 4: Wire `session_start` event (AC: #2)
  - [ ] Call `track('session_start', { categories, difficulty, mode, count })` when session begins
  - [ ] Location: `src/store/session/sessionStore.ts` `startSession()` action OR `src/hooks/session/useSessionSetup.ts`

- [ ] Task 5: Wire `question_answered` event (AC: #3)
  - [ ] Call `track('question_answered', { category, difficulty, type, correct, timeMs })` on answer submit
  - [ ] Location: session store `answerQuestion()` action or question answer hooks

- [ ] Task 6: Wire remaining 9 events (AC: #4)
  - [ ] `session_complete` — on session end with score
  - [ ] `session_abandoned` — on back navigation mid-session
  - [ ] `repeat_mistakes_start` — on "retry wrong answers" action
  - [ ] `preset_saved` — in `presetStore.savePreset()`
  - [ ] `preset_loaded` — on preset selection and launch
  - [ ] `language_changed` — in `uiStore.setLanguage()` or AppHeader toggle handler
  - [ ] `theme_changed` — in `uiStore.setTheme()` or AppHeader toggle handler
  - [ ] `pwa_install_prompt` — in `usePwaInstallToast` when prompt is shown (Story 6.3)
  - [ ] `pwa_update_applied` — in `usePwaUpdateToast.handleUpdate()` (Story 6.4)

- [ ] Task 7: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

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
