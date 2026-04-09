# Story 4.4: Daily Streak Tracking

Status: done

## Story

As a **user**,
I want to see my daily usage streak,
So that I'm motivated to maintain my daily practice habit.

## Acceptance Criteria

1. **Given** the user completes a session
   **When** the SummaryPage renders
   **Then** the streak increments if today's date ≠ `streak.lastActivityDate`
   **And** the streak count is shown prominently in the summary ("Streak: 7 days")
   **And** the streak data is saved via `StorageService.setStreak()`

2. **Given** the user skips one or more days
   **When** the next session completes
   **Then** the streak resets to 1
   **And** the summary shows "Start a new streak today" — positive framing, no guilt message

3. **Given** the user completes multiple sessions in one day
   **When** the streak is updated
   **Then** the streak count does not increment more than once per calendar day

## Tasks / Subtasks

- [x] Task 1: Add `updateStreak` action to `progressStore` (AC: #1, #2, #3)
  - [x] Add `updateStreak: () => void` to `ProgressState` interface
  - [x] Implement action: compute today's ISO date (`new Date().toISOString().slice(0, 10)`)
  - [x] If `streak.lastActivityDate === today`: no-op (AC #3 — already incremented today)
  - [x] If `streak.lastActivityDate` is yesterday (`isYesterday(streak.lastActivityDate, today)`): increment `streak.current + 1`
  - [x] Otherwise (more than 1 day gap or first session): reset to `1`
  - [x] Save via `storageService.setStreak(newStreak)` and `set({ streak: newStreak })`

- [x] Task 2: Call `updateStreak()` from `useSummaryPage` (AC: #1, #2, #3)
  - [x] Get `updateStreak` from `useProgressStore`
  - [x] Call `updateStreak()` in the mount `useEffect` (alongside `saveSessionResults` and `recordAnswer`)
  - [x] Expose `streak` (current + `isNewStreak` flag) to the component

- [x] Task 3: Display streak in `SummaryPage` (AC: #1, #2)
  - [x] Add streak display below the score section
  - [x] If `streak.current > 1`: show `t('streak.count', { count: streak.current })` → "Streak: 7 days"
  - [x] If `streak.current === 1` AND `isNewStreakStart` (was reset): show `t('streak.newStart')` → "Start a new streak today" (positive framing)
  - [x] If `streak.current === 1` AND continuing (first ever session): show count normally

- [x] Task 4: Add i18n keys (AC: #1, #2)
  - [x] `public/locales/en/summary.json` — add `streak.count` (with count interpolation), `streak.newStart`
  - [x] `public/locales/ru/summary.json` — same keys in Russian

- [x] Task 5: Add unit tests for `updateStreak` (AC: #1, #2, #3)
  - [x] In `src/store/progress/progressStore.test.ts` (created in Story 4.2):
    - [x] Test: same day → streak unchanged
    - [x] Test: consecutive day → streak increments
    - [x] Test: gap of 2+ days → streak resets to 1
    - [x] Test: first session (lastActivityDate = '') → streak = 1

- [x] Task 6: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `StreakData` Type (already exists in `src/lib/storage/types.ts`)

```typescript
export interface StreakData {
    current: number;
    lastActivityDate: string; // ISO date string "YYYY-MM-DD"
}
```

Default from `LocalStorageService.getStreak()`: `{ current: 0, lastActivityDate: '' }`.

### `updateStreak` Implementation

```typescript
// Helper — not exported
function isYesterday(dateStr: string, today: string): boolean {
    if (!dateStr) return false;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().slice(0, 10);
}

// In progressStore create():
updateStreak: () => {
    const { streak } = get();
    const today = new Date().toISOString().slice(0, 10);

    if (streak.lastActivityDate === today) return; // already done today

    const isConsecutive = isYesterday(streak.lastActivityDate, today);
    const newStreak: StreakData = {
        current: isConsecutive ? streak.current + 1 : 1,
        lastActivityDate: today,
    };
    storageService.setStreak(newStreak);
    set({ streak: newStreak }, false, { type: 'progress-store/updateStreak' });
},
```

### `useSummaryPage` Changes

```typescript
const updateStreak = useProgressStore.use.updateStreak();
const streak = useProgressStore.use.streak();

// Detect if this call resets the streak (for positive messaging)
// Compute before calling updateStreak — compare current date to lastActivityDate
const isStreakReset = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const last = streak.lastActivityDate;
    return last !== '' && last !== today && !isYesterdayDate(last, today);
}, []); // eslint-disable-line — computed once on mount

// In mount useEffect:
updateStreak();
```

**Note:** `isStreakReset` needs to be computed BEFORE `updateStreak()` is called, so it reflects the pre-update state. Use `useRef` to capture the pre-update value.

```typescript
const isStreakResetRef = useRef<boolean>(false);
// Set before mount effect fires:
isStreakResetRef.current = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const last = streak.lastActivityDate;
    return last !== '' && last !== today && !isYesterdayDate(last, today);
})();

// In mount useEffect:
updateStreak();
// ...
```

### Streak Display in `SummaryPage.tsx`

Add below the score display, above weak topics:

```tsx
{/* Streak */}
{streak.current > 0 && (
    <div className="text-center">
        {isStreakReset ? (
            <p className="text-sm text-muted-foreground">{t('streak.newStart')}</p>
        ) : (
            <p className="text-sm font-medium">
                {t('streak.count', { count: streak.current })}
            </p>
        )}
    </div>
)}
```

### i18n Keys

**`public/locales/en/summary.json`** — add to existing object:
```json
"streak": {
  "count": "Streak: {{count}} days",
  "newStart": "Start a new streak today!"
}
```

**`public/locales/ru/summary.json`** — add:
```json
"streak": {
  "count": "Серия: {{count}} {{count, plural, one{день} few{дня} many{дней} other{дней}}}",
  "newStart": "Начни новую серию сегодня!"
}
```

**Note:** For Russian plural forms, use i18next `count` with `plural` context. Alternatively, use a simple format and let the count speak: `"Серия: {{count}} дн."` — acceptable for v1.

### Files to Modify

```
src/store/progress/progressStore.ts       ← ADD updateStreak action
src/pages/SummaryPage/useSummaryPage.ts   ← CALL updateStreak, expose streak data
src/pages/SummaryPage/SummaryPage.tsx     ← ADD streak display
src/store/progress/progressStore.test.ts  ← ADD updateStreak tests (from Story 4.2)
public/locales/en/summary.json            ← ADD streak keys
public/locales/ru/summary.json            ← ADD streak keys
```

---

## Architecture Compliance

- **No direct `localStorage` calls** — only via `storageService`
- **`progressStore` owns streak** — no streak state in sessionStore or uiStore
- **Pure date logic** — helper function `isYesterday` is pure, testable
- **Positive UX framing** — reset message must not be guilt-inducing (AC #2 explicit)

---

## Project Context Reference

- `StreakData` interface: `src/lib/storage/types.ts`
- `storageService.getStreak()` default: `{ current: 0, lastActivityDate: '' }`
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `progressStore.test.ts` created in Story 4.2 — add `updateStreak` tests there

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Added `isYesterday` pure helper and `updateStreak` action to `progressStore` — handles same-day no-op, consecutive-day increment, gap reset
- Updated `useSummaryPage`: added `isStreakResetRef` (computed pre-update), calls `updateStreak()` in mount effect, exposes `streak` and `isStreakReset`
- Added streak display block to `SummaryPage` between score and weak topics
- Added `streak.count` / `streak.newStart` i18n keys in EN and RU locales
- Added 6 unit tests for `updateStreak` using `vi.useFakeTimers`; updated `SummaryPage.test.tsx` mock to include `updateStreak` and `streak`
- All 230 tests pass, lint and tsc clean

### Review Findings

- [x] [Review][Patch] `isStreakResetRef` re-evaluated on every render — reset message never showed [useSummaryPage.ts:89] — Fixed: lazy `null` sentinel so value is captured once on first render
- [x] [Review][Patch] Duplicate `isYesterday`/`isYesterdayDate` helpers in store and hook — Fixed: extracted to `src/lib/date.ts`, both files import from there
- [x] [Review][Patch] EN i18n plural "Streak: 1 days" — Fixed: added `count_one`/`count_other` keys in `en/summary.json`
- [x] [Review][Patch] Streak UI untested (mock always `current: 0`) — Fixed: made mock dynamic, added 6 streak tests to `SummaryPage.test.tsx`

### File List

- `src/store/progress/progressStore.ts` — MODIFY
- `src/pages/SummaryPage/useSummaryPage.ts` — MODIFY
- `src/pages/SummaryPage/SummaryPage.tsx` — MODIFY
- `src/store/progress/progressStore.test.ts` — MODIFY
- `public/locales/en/summary.json` — MODIFY
- `public/locales/ru/summary.json` — MODIFY
