# Reset Weights Dialog — UX Redesign Proposal

**Component**: `src/components/features/ResetWeightsDialog/`
**Date**: 2026-04-29
**Scope**: inline per-row feedback, sequential resets, a11y announcements, error surfacing.

## 1. Current vs proposed flow

### Current flow (per-category reset)

1. User opens dialog (`isOpen=true`).
2. User clicks `Reset <Category>`.
3. Hook mutates store (or sets `errorMessage` on fetch failure).
4. Hook sets `successMessage`; component **swaps** entire content for green text.
5. 2 s timer fires.
6. `successMessage` cleared, `isOpen` set to `false`.
7. Dialog closes. List is gone; user can't reset another category without re-opening.
8. Result: a fresh user with no weights sees no real change, only the 2 s flash.

### Proposed flow (per-category reset)

1. User opens dialog.
2. User clicks `Reset <Category>` row.
3. Row enters `loading` (spinner icon, label dims, disabled).
4. Hook mutates store.
5. Row enters `success` (green check, accent pulse on row, `aria-live` polite announcement).
6. After 1200 ms row reverts to `idle`. Dialog stays open. List preserved.
7. User may click another row, click `Reset all`, or close manually.
8. On error: row enters `error` (red border, inline error text under row, `role="alert"`); row stays clickable so user can retry.

## 2. Per-row state machine

States: `idle | loading | success | error` — tracked per `slug` in a `Record<string, RowState>`.

| State     | Visual                                                                                                                                                                                          | Trigger in                                                                          | Trigger out                                                                                            | Duration         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------- |
| `idle`    | Default outline button, `RotateCcw` icon, regular label                                                                                                                                         | initial; or 1200 ms after `success`; or user re-clicks an `error` row               | click → `loading`                                                                                      | indefinite       |
| `loading` | Same button, spinner replaces icon, `aria-busy="true"`, `disabled`, label dimmed via `opacity-70`                                                                                               | click on `idle` row (or retry from `error`)                                         | resolve → `success`; reject → `error`                                                                  | typically <500 ms (fetch) |
| `success` | `Check` icon, `text-accent` colour, brief pulse via `animate-in fade-in zoom-in-95 duration-200`, accent border tint, `aria-live` region announces "Weights reset for <category>"                | hook resolves                                                                       | 1200 ms timer → `idle`                                                                                  | exactly 1200 ms  |
| `error`   | Red border (`border-error`), inline `<p role="alert">` under row with reason, button still enabled to retry                                                                                     | hook rejects                                                                        | click on row → `loading`; another row's success does not clear it; explicit close clears it             | until user acts  |

**Total per-row animation budget**: pulse 200 ms + checkmark fade-in 150 ms (overlapping) = ≤300 ms. The 1200 ms cooldown is dwell time, not animation.

**Reset-all** stays a separate state (`resetAllStatus: 'idle' | 'loading' | 'success'`) and keeps the full content swap.

## 3. Component shape changes

### `useResetWeightsDialog.ts`

**Add**:

- `rowStates: Record<string, RowState>` — `RowState = { status: 'idle'|'loading'|'success'|'error'; error?: string }`.
- `resetAllStatus: 'idle' | 'loading' | 'success'` — replaces the current `successMessage` for the all-branch.
- `announcement: string | null` — dedicated text for the visually-hidden `aria-live="polite"` region (set on success and cleared after 1500 ms so consecutive same-row resets re-announce).
- `rowTimersRef: useRef<Record<string, ReturnType<typeof setTimeout>>>` — per-row cooldown timers, cleaned up on unmount and on re-trigger.

**Remove**:

- `successMessage: string | null` (per-category branch). Kept only as a derived value for `resetAll` if convenient, or replaced by `resetAllStatus === 'success'`.
- `errorMessage: string | null` becomes per-row (`rowStates[slug].error`), so the top-level field can be dropped — unless we keep one global field for `resetAll` errors (currently `resetAll` cannot fail; safe to drop).

**Function signatures**:

- `resetCategory: (slug: string) => Promise<void>` — same signature, now drives per-row state instead of global.
- `resetAll: () => Promise<void>` — unchanged.
- `dismissRowError: (slug: string) => void` — new, optional; lets users clear an error without retrying.

**Returned interface (proposed)**:

```ts
interface UseResetWeightsDialogReturn {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    resetAll: () => Promise<void>;
    resetCategory: (slug: string) => Promise<void>;
    dismissRowError: (slug: string) => void;
    categories: ManifestEntry[];
    rowStates: Record<string, { status: RowState; error?: string }>;
    resetAllStatus: 'idle' | 'loading' | 'success';
    announcement: string | null;
}
```

### `ResetWeightsDialog.tsx`

**Add**:

- A small presentational `<ResetCategoryRow>` sub-component (kept in same file) with props `{ slug, label, state, onClick, onDismissError }`.
- A visually-hidden announcer: `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>` at the top of `DialogContent`.

**Remove**:

- The top-level `successMessage` ternary that swaps content. Replace with: render `resetAllStatus === 'success'` overlay swap (kept for the all-branch); otherwise render the row list.
- The single top-of-list `errorMessage` paragraph. Errors now render under their owning row.

**Props delta**:

- Drop `successMessage`, `errorMessage`.
- Add `rowStates`, `resetAllStatus`, `announcement`, `dismissRowError`.

## 4. A11y plan

| Concern                | Where it lives                                                                                                                                                                              | Attribute / text                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog identity        | `<DialogContent>` (already labelled by `DialogTitle`/`Description` via shadcn)                                                                                                              | unchanged                                                                                                                                       |
| Live announcer (success) | hidden div inside `DialogContent`, top of stack                                                                                                                                            | `role="status" aria-live="polite" aria-atomic="true"`; text: `t('resetWeights.successCategory', { category })`                                  |
| Live announcer (error)   | the inline `<p>` rendered under a failing row                                                                                                                                              | `role="alert"` (implicit `aria-live="assertive"`); text: `t('resetWeights.errorCategory')` plus the category name for context                   |
| Row in flight          | the `<button>` itself                                                                                                                                                                       | `aria-busy="true"`, `disabled`, `aria-label` updated to `Resetting <category>…`                                                                  |
| Row error association  | the inline error `<p>` gets `id="reset-error-{slug}"`; the button gets `aria-describedby="reset-error-{slug}"`                                                                              | only while `state.status === 'error'`                                                                                                            |
| Decorative icons       | `RotateCcw`, spinner, `Check`                                                                                                                                                               | `aria-hidden="true"`                                                                                                                             |
| Focus management       | After success, focus stays on the same row (button reverts to idle, keyboard users are not relocated). After error, focus stays on the row; the `aria-describedby` brings the error text into AT focus. | —                                                                                                                                                |
| Reduced motion         | covered globally by `prefers-reduced-motion` block already in `src/index.css` (lines 98–106) — pulse and check reduce to a near-instant state change.                                       | —                                                                                                                                                |

Screen-reader script samples:

- Success: "Weights reset for React"
- Error: "Could not reset React. Please try again."

The two announcer regions (`status` for success, `alert` for error) deliberately split so polite success messages don't preempt assertive error messages.

## 5. Animations (≤300 ms budget per row)

Use already-imported `tw-animate-css` utilities — no library additions, no new keyframes required for the success path.

**Success row pulse + checkmark** (composed onto the row when `status === 'success'`):

- On the icon swap: `animate-in fade-in zoom-in-95 duration-150` (Check icon enters in 150 ms).
- On the row itself: a **one-shot accent ring pulse** via a new keyframe in `src/index.css` (additive only, not modifying existing rules):

    ```css
    @keyframes reset-row-pulse {
        0% {
            box-shadow: 0 0 0 0 var(--color-accent);
        }
        60% {
            box-shadow: 0 0 0 4px transparent;
        }
        100% {
            box-shadow: 0 0 0 0 transparent;
        }
    }
    .animate-reset-row-pulse {
        animation: reset-row-pulse 200ms ease-out 1;
    }
    ```

    Total: 150 ms check + 200 ms pulse, overlapping → ≤300 ms cumulative envelope.

**Loading spinner**: lucide `Loader2` with `animate-spin` (already a Tailwind built-in). No timing budget impact — spinner runs only while the promise is pending.

**Error row**: no entry animation — appearing instantly with the error text is more legible. Optional `animate-in fade-in duration-150` on the inline `<p role="alert">` only.

**Reset-all swap**: keep current behaviour, optionally wrap the success block in `animate-in fade-in zoom-in-95 duration-200` for parity with the rest of the dialog.

## 6. Edge cases

1. **Rapid double-click on same row** — second click is ignored because the button is `disabled` while `status === 'loading'`. While in `success` cooldown the button is also `disabled` (we treat `success` as not-yet-idle). Prevents duplicate fetches.
2. **Click during another row's loading** — independent state per slug; both fetches run in parallel. The `aria-live="polite"` queue announces each completion serially. Acceptable since the underlying `setWeights`/`setErrorRates` writes are last-writer-wins on disjoint key sets.
3. **Click row B while row A is in success cooldown** — row A continues its 1200 ms timer independently; row B transitions normally. No interference.
4. **Error then success in quick succession on the same row** — clicking an `error` row triggers `loading`; on resolve, `state.error` is cleared and `status` becomes `success`. The `role="alert"` paragraph unmounts before the success announcement, so AT users hear only the success message. No stale error left behind.
5. **Dialog close mid-loading** — `close()` clears all per-row timers (`rowTimersRef`), but pending `fetch` promises keep running. We use a `mountedRef` (or AbortController on the fetch) so resolved promises do **not** call `setRowState` after unmount, preventing React warnings and ghost announcements.
6. **`Reset all` clicked while a per-row reset is in flight** — `resetAll` checks `Object.values(rowStates).some(s => s.status === 'loading')`. If true, we either (a) queue `resetAll` after the loading rows settle, or (b) simpler: disable `Reset all` while any row is loading. Recommended: option (b), tooltip `"Wait for in-flight resets"`.
7. **A row whose category file 404s permanently** — error state persists; user can dismiss via X icon (keyboard-accessible) attached to the inline error message.
8. **i18next interpolation with special chars** — display name passes through `getCategoryName(slug, displayName)` exactly as today; existing test (`ResetWeightsDialog.test.tsx`) still passes because button labels remain untouched.

## 7. Reset-all branch

**Recommendation: keep the full-content swap and 2 s auto-close.** Rationale:

- "Reset all" is genuinely terminal — after wiping every weight, there is nothing meaningful left to do in this dialog. Auto-close is a feature, not a bug.
- Visually distinguishing `resetAll` (full-screen success) from `resetCategory` (inline row pulse) reinforces the destructive vs surgical difference, which is the mental model we want.
- It avoids extra design surface (no need for a "reset all" inline state).

Concrete spec: `resetAllStatus: 'loading' | 'success'` drives a centred success block (same component as today's `successMessage` ternary, just keyed off the new field). Auto-close timer remains 2000 ms.

**Alternative considered**: also keep the all-branch on the list (just pulse all rows in sequence). Rejected — it's busier, slower (n × 200 ms pulses), and doesn't match the "I'm done" semantic.

## 8. Estimated effort

**Size: M** (medium — ~3–5 hours including tests).

Tasks:

1. Refactor `useResetWeightsDialog.ts`: introduce `rowStates`, `resetAllStatus`, `announcement`; rewrite `resetCategory` to drive per-row transitions; add `mountedRef` / abort logic; clean up `rowTimersRef` on unmount and on re-trigger.
2. Refactor `ResetWeightsDialog.tsx`: extract `<ResetCategoryRow>`; wire `aria-busy`, `aria-describedby`, inline error rendering; add hidden `role="status"` announcer; keep the full-swap branch for `resetAllStatus`.
3. Add `@keyframes reset-row-pulse` + `.animate-reset-row-pulse` utility to `src/index.css` (additive); confirm `prefers-reduced-motion` already neutralizes it.
4. Update existing tests in `useResetWeightsDialog.test.ts` (replace assertions on `successMessage` with assertions on `rowStates['react'].status`); add new tests for: row stays in cooldown 1200 ms, error sets per-row error, dismissRowError, parallel-row independence, dialog-close-mid-loading does not setState after unmount.
5. Add a render test in `ResetWeightsDialog.test.tsx` for `aria-busy` and `role="alert"` presence.

---

## Biggest tradeoff

Per-row state (`Record<string, RowState>`) plus per-row timers and an `aria-live` announcer adds noticeable complexity to a hook that today is ~100 lines, in exchange for a feedback model where a "no answers yet" user actually sees something happen and can chain resets without re-opening. The simpler alternative — keep one global `successMessage` but stop auto-closing on per-category resets — would solve problem #2 cheaply but not #1 (still no inline confirmation on the clicked row) and is a worse a11y story.
