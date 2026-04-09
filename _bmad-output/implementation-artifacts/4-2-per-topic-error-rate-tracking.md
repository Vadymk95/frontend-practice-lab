# Story 4.2: Per-Topic Error Rate Tracking

Status: done

## Story

As a **user**,
I want the system to track my error rate per topic across sessions,
So that the adaptive algorithm has accurate data to surface my weak areas.

## Acceptance Criteria

1. **Given** a session completes with answered questions
   **When** results are processed in `progressStore`
   **Then** `updateErrorRate(previous, correct)` is called for each question's category
   **And** error rates are stored via `StorageService.setErrorRates()`
   **And** stale question IDs in localStorage are silently ignored — no crash, no data loss (FR49)

2. **Given** `progressStore` loads from localStorage on app start
   **When** stored error rates exist
   **Then** they are restored correctly and used for the next session's weight calculations

3. **Given** `progressStore.recordAnswer(questionId, category, correct)` is called
   **When** the weight update runs
   **Then** the question's weight is recalculated via `calculateWeight()` and saved via `StorageService.setWeights()`
   **And** no weight exceeds `MAX_WEIGHT` or falls below `MIN_WEIGHT`

## Tasks / Subtasks

- [x] Task 1: Add `recordAnswer` action to `progressStore` (AC: #1, #3)
  - [x] Add `recordAnswer: (questionId: string, category: string, correct: boolean) => void` to `ProgressState` interface
  - [x] Implement action body in `progressStore.ts`:
    - [x] Read current `errorRates[category] ?? 0` and call `updateErrorRate(current, correct)`
    - [x] Write updated error rates via `storageService.setErrorRates(newRates)` and `set({ errorRates: newRates })`
    - [x] Read current `weights[questionId] ?? DEFAULT_WEIGHT` and call `calculateWeight(newErrorRate, currentWeight)`
    - [x] Write updated weights via `storageService.setWeights(newWeights)` and `set({ weights: newWeights })`
    - [x] Stale questionId (not found in any loaded questions): silently handled — `weights[questionId]` simply uses DEFAULT_WEIGHT fallback

- [x] Task 2: Call `progressStore.recordAnswer()` from `useSummaryPage` (AC: #1)
  - [x] Import `useProgressStore` in `useSummaryPage.ts` (it's already imported)
  - [x] Get `recordAnswer` action from store
  - [x] In the `useEffect` that persists session results (mount effect), iterate `sessionResultsRef.current` entries and call `recordAnswer(questionId, category, correct)` for each
  - [x] Need question's category: iterate `questionList` to build `Record<questionId, category>` map — use a `useMemo` or derive inline
  - [x] Call `recordAnswer` inside the mount `useEffect` (after `saveSessionResults` call)

- [x] Task 3: Add `progressStore.test.ts` unit tests (AC: #1, #2, #3)
  - [x] Create `src/store/progress/progressStore.test.ts`
  - [x] Test `recordAnswer`: error rate updates for category, weight updates for question
  - [x] Test: weight clamped at MAX_WEIGHT (10), floored at MIN_WEIGHT (0.5)
  - [x] Test: stale questionId (not in pool) processed without crash
  - [x] Test: initial load from storageService (mock storageService)

- [x] Task 4: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### Dependency on Story 4.1

**Story 4.1 must be completed first.** This story calls `updateErrorRate()` and `calculateWeight()` from `src/lib/algorithm/index.ts`. Until Story 4.1 fills in the stubs, `recordAnswer` will call the no-op stubs and produce no meaningful weight change. The architecture is correct — the integration point just needs the real functions.

### `recordAnswer` Implementation

```typescript
// src/store/progress/progressStore.ts — add to ProgressState interface
recordAnswer: (questionId: string, category: string, correct: boolean) => void;

// Inside the create() call:
recordAnswer: (questionId: string, category: string, correct: boolean) => {
    const { errorRates, weights } = get();
    const prevErrorRate = errorRates[category] ?? 0;
    const newErrorRate = updateErrorRate(prevErrorRate, correct);
    const newRates = { ...errorRates, [category]: newErrorRate };

    const prevWeight = weights[questionId] ?? ALGORITHM_CONFIG.DEFAULT_WEIGHT;
    const newWeight = calculateWeight(newErrorRate, prevWeight);
    const newWeights = { ...weights, [questionId]: newWeight };

    storageService.setErrorRates(newRates);
    storageService.setWeights(newWeights);
    set({ errorRates: newRates, weights: newWeights }, false, {
        type: 'progress-store/recordAnswer'
    });
},
```

Add these imports to `progressStore.ts`:
```typescript
import { calculateWeight, updateErrorRate } from '@/lib/algorithm';
import { ALGORITHM_CONFIG } from '@/lib/algorithm/config';
```

### `useSummaryPage.ts` — Call `recordAnswer`

The existing mount `useEffect` saves session results. Extend it to also record answers:

```typescript
// Build category map once (stable ref alongside sessionResultsRef)
const questionCategoryMapRef = useRef<Record<string, string>>({});
questionCategoryMapRef.current = Object.fromEntries(
    questionList.map((q) => [q.id, q.category])
);

// In mount useEffect:
useEffect(() => {
    const results = sessionResultsRef.current;
    if (Object.keys(results).length === 0) return;
    saveSessionResults(results);
    // Record each answer for adaptive algorithm
    const catMap = questionCategoryMapRef.current;
    for (const [questionId, correct] of Object.entries(results)) {
        const category = catMap[questionId];
        if (category) recordAnswer(questionId, category, correct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // intentional — mount only
```

### Stale Question ID Handling (FR49)

If a question ID in localStorage `weights` no longer exists in any loaded JSON file, it is silently retained in the store (never removed). This is correct — no crash, no data corruption. The stale key simply sits unused in the weights record and doesn't affect session sampling.

### `progressStore` Current State

The store currently has `setWeights`, `setErrorRates` as separate batch actions. `recordAnswer` is a new single-answer action that coordinates both. Both approaches coexist — batch setters remain for potential future use (e.g. reset story 5.4).

### Files to Modify

```
src/store/progress/progressStore.ts       ← ADD recordAnswer action + algorithm imports
src/pages/SummaryPage/useSummaryPage.ts   ← CALL recordAnswer in mount effect
src/store/progress/progressStore.test.ts  ← NEW (unit tests)
```

---

## Architecture Compliance

- **Stores never call each other** — `progressStore.recordAnswer` does not import sessionStore
- **Algorithm as pure function** — `calculateWeight` / `updateErrorRate` called as functions, not via store
- **StorageService only** — no direct `localStorage` calls
- **`@/` alias only** — no relative imports

---

## Project Context Reference

- Algorithm functions live in `src/lib/algorithm/index.ts` — exported as named exports
- `ALGORITHM_CONFIG.DEFAULT_WEIGHT = 1.0` — fallback for unknown question IDs
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Added `recordAnswer(questionId, category, correct)` action to `progressStore` — coordinates `updateErrorRate` + `calculateWeight` in a single store action, then persists both via `storageService`
- Added `questionCategoryMapRef` in `useSummaryPage` to safely build questionId→category map without adding deps to mount effect
- Extended mount `useEffect` in `useSummaryPage` to iterate sessionResults and call `recordAnswer` for each after `saveSessionResults`
- Added `progressStore.test.ts` with 9 tests covering: error rate updates (wrong/correct), weight updates, MAX_WEIGHT clamp, MIN_WEIGHT floor, stale questionId no-crash, storageService persistence calls, initial load restoration
- Fixed `SummaryPage.test.tsx` mock — added `recordAnswer: () => mockRecordAnswer` to the `useProgressStore` mock
- All 217 tests pass, lint clean, tsc clean

### Review Findings

**Fixed (2 issues):**
- `mockRecordAnswer` was not reset in `beforeEach` and not asserted in the mount test — added `mockReset()` call and assertion `recordAnswer('q-001', 'JavaScript', true)` to the "calls saveSessionResults on mount" test.
- "restores error rates" test used manual `setState` instead of testing real store initialization — replaced with `vi.resetModules()` + fresh `import('./progressStore')` to verify actual `storageService.getErrorRates()` call on store creation.

**Rejected (false positives):**
- `useProgressStoreBase` export — already exported on line 79.
- `questionCategoryMapRef.current` mutation in render — intentional "render-to-ref" pattern (same as `sessionResultsRef`), not a React side effect.
- `recordAnswer` absent from useEffect deps — Zustand actions are referentially stable; `eslint-disable` is correct.
- "Double persistence" concern — `saveSessionResults` writes `lastSessionResults`; `recordAnswer` writes `weights+errorRates`; no overlap.

### File List

- `src/store/progress/progressStore.ts` — MODIFIED (added `recordAnswer` action + `calculateWeight`/`updateErrorRate`/`ALGORITHM_CONFIG` imports)
- `src/pages/SummaryPage/useSummaryPage.ts` — MODIFIED (added `recordAnswer` call + `questionCategoryMapRef`)
- `src/store/progress/progressStore.test.ts` — NEW (unit tests for `recordAnswer`)
- `src/pages/SummaryPage/SummaryPage.test.tsx` — MODIFIED (added `mockRecordAnswer` to progressStore mock)
