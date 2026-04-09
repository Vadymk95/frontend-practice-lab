# Story 4.1: Adaptive Algorithm — Core Implementation

Status: done

## Story

As a **developer**,
I want the adaptive algorithm implemented as a pure, fully-tested module,
So that question weights are calculated reliably without side effects or edge-case failures.

## Acceptance Criteria

1. **Given** `calculateWeight(errorRate, currentWeight)` is called
   **When** `errorRate > HIGH_ERROR_THRESHOLD` (0.40)
   **Then** the returned weight increases (`currentWeight × HIGH_ERROR_MULTIPLIER`), capped at `MAX_WEIGHT` (10)
   **When** `errorRate < LOW_ERROR_THRESHOLD` (0.15)
   **Then** the returned weight decreases (`currentWeight × LOW_ERROR_MULTIPLIER`), floored at `MIN_WEIGHT` (0.5)
   **And** the result is never `NaN`, `Infinity`, or negative under any input

2. **Given** `updateErrorRate(previous, correct)` is called
   **When** `correct = true`
   **Then** the error rate decreases proportionally (rolling average / exponential decay)
   **When** `correct = false`
   **Then** the error rate increases proportionally
   **And** the result is always in range [0, 1]

3. **Given** `algorithm.test.ts` runs
   **When** all test cases execute
   **Then** `calculateWeight()` and `updateErrorRate()` are covered at 100% including edge cases (NaN input guard, boundary values at thresholds, max/min cap enforcement)
   **And** existing `sampleWeighted()` tests from Story 1.2 continue to pass unchanged

## Tasks / Subtasks

- [x] Task 1: Implement `calculateWeight` in `src/lib/algorithm/index.ts` (AC: #1)
  - [x] Remove the stub body (currently returns `currentWeight` unchanged)
  - [x] If `errorRate > HIGH_ERROR_THRESHOLD`: `return Math.min(currentWeight * HIGH_ERROR_MULTIPLIER, MAX_WEIGHT)`
  - [x] Else if `errorRate < LOW_ERROR_THRESHOLD`: `return Math.max(currentWeight * LOW_ERROR_MULTIPLIER, MIN_WEIGHT)`
  - [x] Else (between thresholds): return `currentWeight` unchanged
  - [x] Guard NaN/Infinity inputs: if `!isFinite(errorRate) || !isFinite(currentWeight)` return `DEFAULT_WEIGHT`

- [x] Task 2: Implement `updateErrorRate` in `src/lib/algorithm/index.ts` (AC: #2)
  - [x] Remove the stub body (currently returns `previous` unchanged)
  - [x] Use exponential moving average: `DECAY = 0.2`
  - [x] Formula: `correct ? previous * (1 - DECAY) : previous * (1 - DECAY) + DECAY`
  - [x] Add `ERROR_RATE_DECAY: 0.2` to `ALGORITHM_CONFIG` in `config.ts`
  - [x] Clamp result to [0, 1]: `Math.max(0, Math.min(1, result))`
  - [x] Guard NaN/Infinity inputs: if `!isFinite(previous)` return `correct ? 0 : 1`

- [x] Task 3: Add comprehensive tests in `src/lib/algorithm/algorithm.test.ts` (AC: #3)
  - [x] `calculateWeight` tests:
    - [x] High error (>0.40): weight increases, capped at MAX_WEIGHT
    - [x] Low error (<0.15): weight decreases, floored at MIN_WEIGHT
    - [x] Mid error (between thresholds): weight unchanged
    - [x] Exactly at HIGH_ERROR_THRESHOLD (0.40): not high → weight unchanged
    - [x] Exactly at LOW_ERROR_THRESHOLD (0.15): not low → weight unchanged
    - [x] NaN errorRate: returns DEFAULT_WEIGHT
    - [x] Infinity errorRate: returns DEFAULT_WEIGHT
    - [x] MAX_WEIGHT at high error → still MAX_WEIGHT (cap enforced)
    - [x] MIN_WEIGHT at low error → still MIN_WEIGHT (floor enforced)
  - [x] `updateErrorRate` tests:
    - [x] correct=true: rate decreases from 0.5 toward 0
    - [x] correct=false: rate increases from 0.5 toward 1
    - [x] correct=true from 0.0 → stays at 0.0 (clamp)
    - [x] correct=false from 1.0 → stays at 1.0 (clamp)
    - [x] Result always in [0, 1]
    - [x] NaN previous: returns 0 (correct=true) or 1 (correct=false)
  - [x] Verify all existing `sampleWeighted()` tests still pass (no changes to that function)

- [x] Task 4: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### Current State of `src/lib/algorithm/index.ts`

The file already has `sampleWeighted` fully implemented. `calculateWeight` and `updateErrorRate` are stubs:

```typescript
// Stubs — full adaptive logic deferred to Story 4.x
export function calculateWeight(_errorRate: number, currentWeight: number): number {
    return currentWeight;
}

export function updateErrorRate(previous: number, _correct: boolean): number {
    return previous;
}
```

Replace only these two functions. Do NOT touch `sampleWeighted` or `shuffle` or `resolveWeight`.

### Target Implementation

```typescript
// src/lib/algorithm/config.ts — ADD ERROR_RATE_DECAY
export const ALGORITHM_CONFIG = {
    HIGH_ERROR_THRESHOLD: 0.4,
    LOW_ERROR_THRESHOLD: 0.15,
    HIGH_ERROR_MULTIPLIER: 2.0,
    LOW_ERROR_MULTIPLIER: 0.5,
    MAX_WEIGHT: 10,
    MIN_WEIGHT: 0.5,
    DEFAULT_WEIGHT: 1.0,
    ERROR_RATE_DECAY: 0.2,
} as const;
```

```typescript
// src/lib/algorithm/index.ts — replace stubs
export function calculateWeight(errorRate: number, currentWeight: number): number {
    if (!isFinite(errorRate) || !isFinite(currentWeight)) return ALGORITHM_CONFIG.DEFAULT_WEIGHT;
    if (errorRate > ALGORITHM_CONFIG.HIGH_ERROR_THRESHOLD) {
        return Math.min(currentWeight * ALGORITHM_CONFIG.HIGH_ERROR_MULTIPLIER, ALGORITHM_CONFIG.MAX_WEIGHT);
    }
    if (errorRate < ALGORITHM_CONFIG.LOW_ERROR_THRESHOLD) {
        return Math.max(currentWeight * ALGORITHM_CONFIG.LOW_ERROR_MULTIPLIER, ALGORITHM_CONFIG.MIN_WEIGHT);
    }
    return currentWeight;
}

export function updateErrorRate(previous: number, correct: boolean): number {
    if (!isFinite(previous)) return correct ? 0 : 1;
    const decay = ALGORITHM_CONFIG.ERROR_RATE_DECAY;
    const updated = correct
        ? previous * (1 - decay)
        : previous * (1 - decay) + decay;
    return Math.max(0, Math.min(1, updated));
}
```

### Threshold Boundary Behavior

- `errorRate === 0.40` (exactly at HIGH threshold): NOT > threshold → weight unchanged (neutral zone)
- `errorRate === 0.15` (exactly at LOW threshold): NOT < threshold → weight unchanged (neutral zone)
- This is intentional — boundaries are exclusive, not inclusive.

### Test File Structure

Add new describe blocks to existing `algorithm.test.ts` after the `sampleWeighted` describe block:

```typescript
describe('calculateWeight', () => {
  // tests here
});

describe('updateErrorRate', () => {
  // tests here
});
```

### Files to Modify

```
src/lib/algorithm/config.ts      ← ADD ERROR_RATE_DECAY constant
src/lib/algorithm/index.ts       ← REPLACE calculateWeight and updateErrorRate stubs
src/lib/algorithm/algorithm.test.ts  ← ADD calculateWeight + updateErrorRate test blocks
```

---

## Architecture Compliance

- **Pure functions** — `calculateWeight` and `updateErrorRate` have no side effects, no store imports
- **All constants in ALGORITHM_CONFIG** — no magic numbers in implementation
- **100% test coverage** of new functions required (architecture mandate)
- **`@/` alias only** — no relative imports in test files

---

## Project Context Reference

- ALGORITHM_CONFIG is in `src/lib/algorithm/config.ts` — all constants live there
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `sampleWeighted` is already fully implemented and tested — do NOT modify it

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Floating point precision issue in `updateErrorRate` test: `0.5 * 0.8 + 0.2 = 0.6000000000000001`. Fixed by using `toBeCloseTo(0.6, 10)` instead of `toBe(0.6)`.

### Completion Notes List

- Implemented `calculateWeight` with exclusive boundary checks (≥0.40 neutral, >0.40 high). Guards NaN/Infinity inputs by returning DEFAULT_WEIGHT.
- Implemented `updateErrorRate` with exponential moving average (DECAY=0.2). Clamps result to [0,1]. Guards NaN by returning 0 (correct) or 1 (incorrect).
- Added `ERROR_RATE_DECAY: 0.2` to `ALGORITHM_CONFIG` in `config.ts`.
- Added 12 `calculateWeight` tests + 7 `updateErrorRate` tests. All 206 tests pass (23 test files), 0 regressions.

### Review Findings

- [x] [Review][Patch] `calculateWeight` returns negative for negative `currentWeight` — AC #1 violation ["never negative under any input"]. Fixed: extended NaN/Infinity guard to also reject `currentWeight < 0`, returning `DEFAULT_WEIGHT`. [src/lib/algorithm/index.ts:53]
- [x] [Review][Patch] Missing test for negative `currentWeight` input — added `'negative currentWeight: returns DEFAULT_WEIGHT'` test case. [src/lib/algorithm/algorithm.test.ts]
- [x] [Review][Defer] `resolveWeight` does not validate stored negative weights from external `weights` map — pre-existing, out of Story 4.1 scope. deferred, pre-existing

### File List

- `src/lib/algorithm/config.ts` — MODIFIED (added ERROR_RATE_DECAY: 0.2)
- `src/lib/algorithm/index.ts` — MODIFIED (implemented calculateWeight and updateErrorRate stubs)
- `src/lib/algorithm/algorithm.test.ts` — MODIFIED (added calculateWeight and updateErrorRate describe blocks)

### Change Log

- 2026-04-09: Story 4.1 implemented — adaptive algorithm core (calculateWeight + updateErrorRate) with 100% test coverage of new functions.
