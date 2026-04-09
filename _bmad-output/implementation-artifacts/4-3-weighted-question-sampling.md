# Story 4.3: Weighted Question Sampling in Sessions

Status: done

## Story

As a **user**,
I want questions from my weak topics to appear more frequently in my sessions,
So that the app automatically focuses my practice where I need it most.

## Acceptance Criteria

1. **Given** a session is configured and started
   **When** `useSessionSetup` samples questions
   **Then** `sampleWeighted()` is called with current weights from `progressStore`
   **And** questions from categories with high error rate appear proportionally more often
   **And** questions from every selected category appear at least once if pool allows

2. **Given** a user has no prior progress data (first session)
   **When** questions are sampled
   **Then** all weights default to `1.0` (DEFAULT_WEIGHT) and sampling is effectively uniform random

## Tasks / Subtasks

- [x] Task 1: Verify `useSessionSetup` already passes weights correctly (AC: #1, #2)
  - [x] Read `src/hooks/session/useSessionSetup.ts` — confirm it reads `weights` from `useProgressStore` and passes to `sampleWeighted(filtered, weights, config.questionCount)`
  - [x] Confirm empty `weights = {}` case → `sampleWeighted` uses `DEFAULT_WEIGHT = 1.0` fallback via `resolveWeight` in `algorithm/index.ts`
  - [x] If the above is already correct: this is a validation/integration task — no code changes to `useSessionSetup` needed

- [x] Task 2: Add integration test for weighted sampling (AC: #1, #2)
  - [x] In `src/hooks/session/useSessionSetup.test.ts`, add test cases:
    - [x] "uses uniform weights on first session (empty weights)" — verify all categories can appear
    - [x] "high-weighted questions appear more frequently when weights provided" — call `sampleWeighted` directly with skewed weights, verify distribution bias

- [x] Task 3: Verify "at least one per category" behavior (AC: #1)
  - [x] The current `sampleWeighted` does weighted random sampling without per-category guarantee
  - [x] Check epics.md AC: "questions from every selected category appear at least once if pool allows"
  - [x] If `sampleWeighted` doesn't guarantee per-category presence: add a pre-sample step in `useSessionSetup` that ensures at least 1 question per category before filling the remainder with weighted sampling
  - [x] See Dev Notes for the recommended approach

- [x] Task 4: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### Current State — Sampling is Already Wired

`useSessionSetup.ts` already does:
```typescript
const weights = useProgressStore.use.weights();
// ...
const sampled = sampleWeighted(filtered, weights, config.questionCount);
```

This is fully wired. After Story 4.1 implements the real `calculateWeight` and Story 4.2 calls `recordAnswer`, the weights in `progressStore` will reflect real adaptive data and `sampleWeighted` will automatically produce biased sampling.

**The main work in this story is:**
1. Verify the wiring is correct (it is)
2. Implement the "at least one per category" guarantee
3. Add tests

### Per-Category Guarantee Implementation

The current pure weighted sampling doesn't guarantee one question per category. Add this logic to `useSessionSetup`:

```typescript
function sampleWithCategoryGuarantee(
    questions: Question[],
    weights: Record<string, number>,
    count: number,
    categories: string[]
): Question[] {
    if (count >= questions.length) return shuffle(questions);

    const seeded: Question[] = [];
    const remaining = [...questions];

    // Seed one question per selected category (weighted pick from that category)
    for (const cat of categories) {
        const catPool = remaining.filter((q) => q.category === cat);
        if (catPool.length === 0) continue;
        const picked = sampleWeighted(catPool, weights, 1)[0];
        if (picked) {
            seeded.push(picked);
            const idx = remaining.findIndex((q) => q.id === picked.id);
            if (idx !== -1) remaining.splice(idx, 1);
        }
        if (seeded.length >= count) break;
    }

    // Fill remaining slots with weighted sampling from the rest
    const fillCount = Math.max(0, count - seeded.length);
    const filled = fillCount > 0 ? sampleWeighted(remaining, weights, fillCount) : [];
    return shuffle([...seeded, ...filled]);
}
```

Use `sampleWithCategoryGuarantee` instead of `sampleWeighted` in `useSessionSetup`.

**Note:** Only add this if the "at least one per category" guarantee is needed. If the pool is small enough that weighted sampling already covers it, the overhead may not be worth it. Check the AC carefully — "if pool allows" suggests best-effort.

### Simpler Approach (acceptable if above is over-engineering)

If `questionCount >= categories.length` (typical use case: 10 questions across 2-3 categories), weighted random sampling will almost always include each category. The guarantee only matters edge cases. Acceptable to add a note in the story that this is probabilistic, not guaranteed.

**Decision:** Implement the per-category guarantee for correctness. It's clean and matches the AC.

### Files to Modify

```
src/hooks/session/useSessionSetup.ts      ← ADD sampleWithCategoryGuarantee (or validate existing logic is sufficient)
src/hooks/session/useSessionSetup.test.ts ← ADD weighted sampling tests
```

---

## Architecture Compliance

- **`useSessionSetup` as coordinator** — reads from `progressStore` + data hooks, writes to `sessionStore`
- **Stores never call each other** — no direct store-to-store calls
- **`sampleWeighted` imported from `@/lib/algorithm`** — not reimplemented
- **`@/` alias only**

---

## Previous Story Intelligence

### From Story 1.2 / Existing Code

- `sampleWeighted` in `src/lib/algorithm/index.ts` already handles `weights = {}` gracefully (uses `DEFAULT_WEIGHT`)
- `useSessionSetup` in `src/hooks/session/useSessionSetup.ts` already passes `weights` from `progressStore`

### From Story 4.1

- After 4.1: `calculateWeight` and `updateErrorRate` are real — weights in `progressStore` will be meaningful
- From Story 4.2: `recordAnswer` persists updated weights — pool will be adaptive after the first session

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `shuffle` is internal to `algorithm/index.ts` — not exported. If needed for tests, use `sampleWeighted` with full pool.

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Task 1: Wiring already correct — `useSessionSetup` reads `weights` from `progressStore` and passes to `sampleWeighted`. `resolveWeight` uses `DEFAULT_WEIGHT=1.0` for empty weights map. No changes needed.
- Task 2: Added "uses uniform weights on first session" test (verifies empty `{}` weights are passed through) and "high-weighted questions appear more frequently" statistical test using `vi.importActual` to bypass mock and run 100-sample distribution check with 10x bias weights.
- Task 3: Implemented `sampleWithCategoryGuarantee` (exported) in `useSessionSetup.ts`. Seeds one weighted question per category, fills remaining slots with `sampleWeighted`, shuffles via `sampleWeighted(combined, weights, combined.length)`. Replaced `sampleWeighted` call in `useSessionSetup` hook. Updated "calls sampleWeighted with questionCount" test to assert `questionList.length` instead of `sampleWeighted` call args (internal call pattern changed). Added 4 direct unit tests for `sampleWithCategoryGuarantee`. Updated `makeQuestion` helper with optional `category` param.
- Task 4: All 223 tests pass. No lint errors. TypeScript clean.

### Review Findings

_none yet_

### File List

- `src/hooks/session/useSessionSetup.ts` — MODIFIED (added exported `sampleWithCategoryGuarantee`, replaced `sampleWeighted` call in hook)
- `src/hooks/session/useSessionSetup.test.ts` — MODIFIED (added `sampleWithCategoryGuarantee` import, updated `makeQuestion` helper, updated "calls sampleWeighted with questionCount" test, added "uses uniform weights on first session" and "high-weighted questions appear more frequently" tests, added `sampleWithCategoryGuarantee` describe block with 5 tests)

## Change Log

- Implemented `sampleWithCategoryGuarantee` in `useSessionSetup.ts` — seeds one weighted question per selected category before filling remaining slots, ensuring per-category presence when pool allows (AC #1). Used `sampleWeighted(combined, combined.length)` for final shuffle. (Date: 2026-04-09)
- Added 7 new tests: 2 in `useSessionSetup` describe (uniform weights, distribution bias) + 5 in new `sampleWithCategoryGuarantee` describe. Updated `makeQuestion` helper with optional category param. Fixed "calls sampleWeighted with questionCount" test to assert on `questionList` length. (Date: 2026-04-09)
