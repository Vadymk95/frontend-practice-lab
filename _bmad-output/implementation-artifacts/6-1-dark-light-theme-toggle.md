# Story 6.1: Dark/Light Theme Toggle

Status: ready-for-dev

## Story

As a **user**,
I want to toggle between dark and light themes,
so that I can use the app comfortably in different lighting conditions.

## Acceptance Criteria

1. **Given** the user opens the app for the first time
   **When** the app loads
   **Then** dark theme is active by default (`.dark` class on `<html>`)
   **And** theme preference is loaded from `storageService.getTheme()`

2. **Given** the user taps the theme toggle in `AppHeader`
   **When** the toggle fires
   **Then** `uiStore.setTheme()` is called and `storageService.setTheme()` persists the value
   **And** the `.dark` class is added/removed from `<html>` immediately
   **And** all colour tokens switch to their light-mode overrides

3. **Given** the user reloads the app
   **When** the app initialises
   **Then** the previously selected theme is restored via `uiStore.initTheme()`

## Tasks / Subtasks

- [ ] Task 1: Wire theme toggle in `AppHeader` (AC: #1, #2, #3)
  - [ ] Read `theme` from `useUiStore.use.theme()`
  - [ ] Call `useUiStore.use.setTheme()` on button click — toggle `'dark'` ↔ `'light'`
  - [ ] Swap Moon icon for Sun icon when theme is `'light'` (both from `lucide-react`)
  - [ ] Update `aria-label` dynamically: `t('header.toggleTheme')`

- [ ] Task 2: Ensure `initTheme()` is called on app mount (AC: #1, #3)
  - [ ] Confirm `uiStore.initTheme()` is called in `main.tsx` or `App.tsx` before render
  - [ ] If not wired — add `useEffect(() => { useUiStoreBase.getState().initTheme(); }, [])` to `App.tsx`

- [ ] Task 3: Add i18n keys (AC: #2)
  - [ ] Ensure `public/locales/en/common.json` has `header.toggleTheme` key (already exists — verify value is accurate for both states)
  - [ ] Mirror in `public/locales/ru/common.json`

- [ ] Task 4: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

## Dev Notes

### CRITICAL: uiStore Already Implemented — Do NOT Reinvent

`src/store/ui/uiStore.ts` already has everything needed. **Read it before touching anything.**

```typescript
// src/store/ui/uiStore.ts — EXISTING API (do not change)
setTheme: (theme: 'dark' | 'light') => void
// - calls document.documentElement.classList.toggle('dark', theme === 'dark')
// - calls storageService.setTheme(theme)
// - calls set({ theme })

initTheme: () => void
// - reads storageService.getTheme()
// - applies .dark class
// - sets store state
```

The store already handles both the DOM class toggle and persistence. Your only job in `AppHeader` is to **read the state and call setTheme on click**.

### AppHeader Integration — Exact Location

`src/components/layout/AppHeader/AppHeader.tsx` — the Moon button is already there (line ~31-37). It currently has no `onClick`. Wire it:

```typescript
// In AppHeader.tsx
import { Moon, Sun, Settings } from 'lucide-react';

// Inside component:
const theme = useUiStore.use.theme();
const setTheme = useUiStore.use.setTheme();
// ...
<button
  type="button"
  aria-label={t('header.toggleTheme')}
  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
  className="rounded p-1 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-alt"
>
  {theme === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
</button>
```

`Sun` is already in `lucide-react` — no new package needed.

### initTheme — Check if Already Wired

Search `src/main.tsx` and `src/App.tsx` for `initTheme`. If not present, add to `App.tsx`:

```typescript
// src/App.tsx — add inside App component
import { useEffect } from 'react';
import { useUiStore } from '@/store/ui/uiStore';

export function App() {
  useEffect(() => {
    useUiStore.use.initTheme()();
  }, []);
  // ...
}
```

Or call it imperatively before React hydration in `main.tsx`:

```typescript
// src/main.tsx — before ReactDOM.createRoot
import { useUiStoreBase } from '@/store/ui/uiStore'; // if base store is exported
// OR use storageService directly:
import { storageService } from '@/lib/storage';
const theme = storageService.getTheme();
document.documentElement.classList.toggle('dark', theme === 'dark');
```

Check what pattern is currently in `main.tsx` — don't add duplicate logic.

### Tailwind v4 Dark Mode

Dark mode is via `.dark` class on `<html>` — configured in `src/index.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

**No `tailwind.config.ts` exists.** Do NOT create one. All theme tokens are in `src/index.css` under `@theme inline {}`.

### No Tests Required for This Story

This story wires existing logic — `useAppHeader.ts` has no logic (`return {}`). The toggle is a single `onClick` with a store call. TDD rule: hooks > 10 lines of logic. This doesn't qualify — no test file needed.

If `useAppHeader` grows beyond 10 lines, extract logic there and add tests.

### i18n Keys Already Exist

`public/locales/en/common.json` has `header.toggleTheme` and `header.toggleLanguage`. Verify they have meaningful values — update wording if needed (e.g., "Switch to light mode" / "Switch to dark mode").

### Architecture Compliance Checklist

- `useUiStore.use.theme()` — selector pattern (not `useUiStore(s => s.theme)`)
- `useUiStore.use.setTheme()` — same
- No logic > 10 lines in JSX
- `@/` alias for all imports
- No new packages needed — `Sun` is already in `lucide-react`

### References

- `src/store/ui/uiStore.ts` — `setTheme`, `initTheme` (source of truth)
- `src/lib/storage/LocalStorageService.ts` — `getTheme/setTheme` using key `ios_theme`
- `src/components/layout/AppHeader/AppHeader.tsx` — integration point (Moon button)
- `src/store/utils/createSelectors.ts` — `use.fieldName()` selector pattern
- Story 5.4 (`5-4-reset-question-weights.md`) — established `useUiStore.use.*()` pattern
