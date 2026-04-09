# Story 3.5: Post-Session Review Mode Selection

Status: done

## Story

As a **user**,
I want to choose what to review at the end of a session — only failed, only skipped, both, or restart,
So that I can focus my review time on exactly what I need.

## Acceptance Criteria

1. **Given** the session has ended and the SummaryPage is shown
   **When** the summary renders
   **Then** review options are shown based on what exists:
   - "Repeat wrong answers (N)" — shown only if wrong answers exist (wrong = answered but incorrect, not skipped)
   - "Repeat skipped (N)" — shown only if skipped questions exist
   - "Repeat all mistakes (N)" — shown only if BOTH wrong and skipped exist
   - "Restart session" — always shown as a secondary option

2. **Given** the user selects a review option
   **When** the review session loads
   **Then** `sessionStore` is populated with only the relevant subset of questions
   **And** the session starts with progress "1 / N" reflecting the subset count

## Tasks / Subtasks

- [x] Task 1: Update `useSummaryPage` — compute review subsets (AC: #1, #2)
  - [x] Modify `src/pages/SummaryPage/useSummaryPage.ts`
  - [x] Read `skipList = useSessionStore.use.skipList()` (already added in Story 3.4)
  - [x] Derive `skippedQuestions: Question[]` — questions whose id is in `skipList`
  - [x] Derive `pureWrongQuestions: Question[]` — `wrongQuestions` minus skipped ones (answered incorrectly but NOT skipped)
  - [x] Derive `allMistakeQuestions: Question[]` — union of pureWrongQuestions + skippedQuestions (deduped)
  - [x] Add handlers: `handleRepeatWrong`, `handleRepeatSkipped`, `handleRepeatAllMistakes`, `handleRestartSession`
  - [x] Each handler calls `setRepeatMistakes(subset)` then `navigate(RoutesPath.SessionPlay)`
  - [x] `handleRestartSession`: calls `setRepeatMistakes(questionList)` (same full set) then navigates
  - [x] Remove old `handleRepeatMistakes` and `handleTryAgain` — replaced by the new handlers
  - [x] Return: `pureWrongCount`, `skippedCount`, `allMistakesCount`, `handleRepeatWrong`, `handleRepeatSkipped`, `handleRepeatAllMistakes`, `handleRestartSession`, plus existing `correctCount`, `totalCount`, `weakTopics`, `isPerfectScore`

- [x] Task 2: Refactor `SummaryPage.tsx` — conditional review CTAs (AC: #1)
  - [x] Modify `src/pages/SummaryPage/SummaryPage.tsx`
  - [x] Replace existing CTA block with conditional rendering:
    - If `pureWrongCount > 0`: show "Repeat wrong answers (N)" as `variant="default"` button
    - If `skippedCount > 0`: show "Repeat skipped (N)" as `variant="default"` or `variant="secondary"` button
    - If both `pureWrongCount > 0 && skippedCount > 0`: show "Repeat all mistakes (N)" as additional option
    - Always show "Restart session" as `variant="outline"` button
    - Always show "New session" (go home) as `variant="ghost"` button
  - [x] Perfect score path: `isPerfectScore` is now only true when `pureWrongCount === 0 && skippedCount === 0`
  - [x] Remove old `handleRepeatMistakes`, `handleTryAgain`, `handleHome` in favor of new handlers (keep `handleHome` for "New session")

- [x] Task 3: Add i18n keys (AC: #1)
  - [x] `public/locales/en/summary.json` — add action keys
  - [x] `public/locales/ru/summary.json` — add action keys

- [x] Task 4: Update tests (AC: #1, #2)
  - [x] Modify `src/pages/SummaryPage/SummaryPage.test.tsx` if exists — update for new CTA logic
  - [x] Verify existing tests still pass

- [x] Task 5: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `useSummaryPage.ts` — Key Changes

**Current state** (from reading the file): The hook derives `wrongQuestions` as all questions where `isCorrectAnswer()` returns `false`. After Story 3.4, this includes skipped questions (since `answers[id] === 'skipped'` → `isCorrectAnswer` returns `false`).

**New derivations needed**:
```typescript
const skipList = useSessionStore.use.skipList();

// Inside the useMemo block — add alongside existing computation:
const skippedQuestions = questionList.filter(q => skipList.includes(q.id));
const pureWrongQuestions = wrongQuestions.filter(q => !skipList.includes(q.id));
const allMistakeQuestions = [
  ...pureWrongQuestions,
  ...skippedQuestions.filter(q => !pureWrongQuestions.find(w => w.id === q.id))
];
// allMistakeQuestions = pureWrong + skipped (deduped union)
```

**New handlers**:
```typescript
const handleRepeatWrong = () => {
  setRepeatMistakes(pureWrongQuestions);
  navigate(RoutesPath.SessionPlay);
};

const handleRepeatSkipped = () => {
  setRepeatMistakes(skippedQuestions);
  navigate(RoutesPath.SessionPlay);
};

const handleRepeatAllMistakes = () => {
  setRepeatMistakes(allMistakeQuestions);
  navigate(RoutesPath.SessionPlay);
};

const handleRestartSession = () => {
  setRepeatMistakes(questionList);
  navigate(RoutesPath.SessionPlay);
};
```

**`isPerfectScore`** — update definition:
```typescript
const isPerfectScore = pureWrongQuestions.length === 0 && skippedQuestions.length === 0;
```

### `SummaryPage.tsx` — CTA Block

Replace existing CTA section with:
```tsx
<div className="flex flex-col gap-3 mt-2">
  {isPerfectScore ? (
    <>
      <Button onClick={handleRestartSession} variant="default">
        {t('actions.tryAgain')}
      </Button>
      <Button onClick={handleHome} variant="secondary">
        {t('actions.trySomethingElse')}
      </Button>
    </>
  ) : (
    <>
      {pureWrongCount > 0 && skippedCount > 0 && (
        <Button onClick={handleRepeatAllMistakes} variant="default">
          {t('actions.repeatAllMistakes', { count: allMistakesCount })}
        </Button>
      )}
      {pureWrongCount > 0 && (
        <Button
          onClick={handleRepeatWrong}
          variant={skippedCount > 0 ? 'secondary' : 'default'}
        >
          {t('actions.repeatWrong', { count: pureWrongCount })}
        </Button>
      )}
      {skippedCount > 0 && (
        <Button
          onClick={handleRepeatSkipped}
          variant={pureWrongCount > 0 ? 'secondary' : 'default'}
        >
          {t('actions.repeatSkipped', { count: skippedCount })}
        </Button>
      )}
      <Button onClick={handleRestartSession} variant="outline">
        {t('actions.restart')}
      </Button>
    </>
  )}
  <Button onClick={handleHome} variant="ghost">
    {t('actions.home')}
  </Button>
</div>
```

### i18n Keys

**`public/locales/en/summary.json`** — update `actions`:
```json
"actions": {
  "repeatAllMistakes": "Repeat all mistakes ({{count}})",
  "repeatWrong": "Repeat wrong answers ({{count}})",
  "repeatSkipped": "Repeat skipped ({{count}})",
  "restart": "Restart session",
  "tryAgain": "Try again",
  "trySomethingElse": "Try something else",
  "home": "Home"
}
```

Remove `repeatMistakes` and `newSession` keys (or keep for backwards compatibility if tests reference them — check existing tests first).

**`public/locales/ru/summary.json`** — add:
```json
"actions": {
  "repeatAllMistakes": "Повторить все ошибки ({{count}})",
  "repeatWrong": "Повторить неверные ({{count}})",
  "repeatSkipped": "Повторить пропущенные ({{count}})",
  "restart": "Начать заново",
  "tryAgain": "Попробовать ещё раз",
  "trySomethingElse": "Попробовать другое",
  "home": "Домой"
}
```

### File Structure

```
src/pages/SummaryPage/useSummaryPage.ts  ← MODIFY
src/pages/SummaryPage/SummaryPage.tsx    ← MODIFY
public/locales/en/summary.json           ← MODIFY
public/locales/ru/summary.json           ← MODIFY (may need to create)
```

Note: `public/locales/ru/summary.json` may not exist — check and create if missing.

---

## Previous Story Intelligence

### From Story 3.4

- `skipList` is now in `sessionStore` — `useSessionStore.use.skipList()`
- Skipped questions have `answers[id] === 'skipped'` AND `skipList.includes(id)` — use `skipList` to identify skipped subset
- `setRepeatMistakes(questions)` in `sessionStore` resets session with new question list + clears `answers` and `skipList`

### From Story 2.5

- `handleRepeatMistakes` currently calls `setRepeatMistakes(wrongQuestions)` and navigates — this pattern is reused for all new handlers

---

## Architecture Compliance

- **No new stores** — all data comes from existing `sessionStore`
- **`setRepeatMistakes`** — already handles `skipList` reset: `set({ questionList, currentIndex: 0, answers: {}, skipList: [] })`
- **`@/` alias only** — no relative imports
- **i18n** — `useTranslation('summary')` namespace for all SummaryPage strings

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `setRepeatMistakes`: `src/store/session/sessionStore.ts:88` — sets `questionList`, resets `currentIndex`, `answers`, `skipList`
- `RoutesPath.SessionPlay`: `src/router/routes.ts`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no blockers.

### Completion Notes List

- Replaced single `handleRepeatMistakes` / `handleTryAgain` with four targeted handlers: `handleRepeatWrong`, `handleRepeatSkipped`, `handleRepeatAllMistakes`, `handleRestartSession`
- `isPerfectScore` now requires both `pureWrongCount === 0` AND `skippedCount === 0`
- `allMistakeQuestions` uses deduped union (pureWrong + skipped) via filter — no duplicate IDs
- All three subsets computed via `useMemo` for stable references
- i18n: removed deprecated keys `repeatMistakes` / `newSession`; added `repeatAllMistakes`, `repeatWrong`, `repeatSkipped`, `restart`
- Tests fully rewritten: 187 tests pass (23 test files), no regressions

### File List

- `src/pages/SummaryPage/useSummaryPage.ts` — modified
- `src/pages/SummaryPage/SummaryPage.tsx` — modified
- `src/pages/SummaryPage/SummaryPage.test.tsx` — modified
- `public/locales/en/summary.json` — modified
- `public/locales/ru/summary.json` — modified

### Change Log

- feat(summary): implement post-session review mode selection (Story 3.5) — 2026-04-09
