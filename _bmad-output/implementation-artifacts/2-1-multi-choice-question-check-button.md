# Story 2.1: Multi-Choice Question with Check Button

Status: review

## Story

As a **user**,
I want to select multiple options and confirm my answer with a Check button,
So that I can answer questions that require multiple correct selections before seeing the result.

## Acceptance Criteria

1. **Given** the current question is of type `multi-choice`
   **When** the question renders
   **Then** `AnswerOption` components render in checkbox variant (multi-select enabled)
   **And** a "Check" primary CTA is shown in the sticky bottom bar (disabled until at least one option selected)

2. **Given** the user selects one or more options and taps "Check"
   **When** the answer is evaluated
   **Then** correct selections → `bg-accent/10` + `border-accent` + checkmark icon (✓)
   **And** incorrect selections → `bg-error/10` + `border-error` + cross icon (✗)
   **And** correct options the user missed also highlight with `bg-accent/10` (no icon — subtle)
   **And** `ExplanationPanel` appears within ≤ 150ms
   **And** "Next" replaces "Check" in the sticky bottom bar

3. **Given** the answer is revealed
   **When** the result is recorded
   **Then** `setAnswer(question.id, selectedIndices)` is called with `number[]`
   **And** stored as correct only if: every correct index was selected AND no incorrect index was included

## Tasks / Subtasks

- [x] Task 1: Extend `AnswerOption` with checkbox variant (AC: #1, #2)
  - [x] Add `variant: 'radio' | 'checkbox'` prop (default: `'radio'`)
  - [x] Add `isMissed?: boolean` prop — correct option user did NOT select (shown post-reveal)
  - [x] Change `role` to `"checkbox"` when `variant === 'checkbox'`
  - [x] For `isMissed`: render `bg-accent/10` border highlight without icon (AC: missed correct)
  - [x] Keep existing radio behaviour unchanged (no regression)

- [x] Task 2: Create `MultiChoiceQuestion` component (AC: #1, #2, #3)
  - [x] Create folder `src/components/features/QuestionCard/MultiChoice/`
  - [x] `MultiChoiceQuestion.tsx` — presentational, uses `useMultiChoiceQuestion` hook
  - [x] `useMultiChoiceQuestion.ts` — all logic (see Dev Notes)
  - [x] `MultiChoiceQuestion.test.tsx` — unit tests (see Testing section)
  - [x] `index.ts` — re-export

- [x] Task 3: Wire `MultiChoiceQuestion` into `QuestionCard` (AC: #1)
  - [x] Add branch `question.type === 'multi-choice'` in `QuestionCard.tsx`
  - [x] Pass `onSelectionChange` and `onCheck` callbacks from `QuestionCard` (received from `SessionPlayPage` via props — see Dev Notes on coordination)

- [x] Task 4: Update `SessionPlayPage` sticky bottom bar (AC: #1, #2)
  - [x] Add state: `multiHasSelection: boolean` and `handleMultiCheck: (() => void) | null`
  - [x] When current question is `multi-choice` and not yet answered: show "Check" button (disabled if `!multiHasSelection`)
  - [x] When answered: show "Next" as usual (existing behaviour, unchanged)
  - [x] Pass `onSelectionChange` and `onCheck` to `QuestionCard`
  - [x] Update `useSessionPlayPage` to expose `currentQuestion`

- [x] Task 5: Add i18n keys (AC: #1)
  - [x] `public/locales/en/question.json` — add `"check": "Check"`
  - [x] `public/locales/ru/question.json` — add `"check": "Проверить"`

- [x] Task 6: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

---

## Dev Notes

### CRITICAL: Bottom Bar Coordination (Read First)

The sticky bottom bar is owned by `SessionPlayPage`. For single-choice, it shows "Next" only after the answer is committed to the store (`answers[id] !== undefined`). For multi-choice, a "Check" button must appear **before** the answer is committed.

The problem: `selectedIndices` lives inside `MultiChoiceQuestion` (local hook state). `SessionPlayPage` needs to know (a) whether any option is selected and (b) how to trigger the Check action.

**Recommended approach — callback props flowing down:**

```
SessionPlayPage
  │  state: multiHasSelection, handleMultiCheck
  │  passes: onSelectionChange, onCheck → QuestionCard
  └── QuestionCard
        │  passes: onSelectionChange, onCheck → MultiChoiceQuestion (only for multi-choice branch)
        └── MultiChoiceQuestion
              calls onSelectionChange(hasSelection) on every toggle
              calls onCheck() on explicit button tap (optional alternative location)
```

`SessionPlayPage.tsx` manages `multiHasSelection` and `handleMultiCheck` as local React state:

```tsx
const [multiHasSelection, setMultiHasSelection] = useState(false);
const [handleMultiCheck, setHandleMultiCheck] = useState<(() => void) | null>(null);
```

`useMultiChoiceQuestion` exposes a stable `onCheck` callback that:
1. Calls `setAnswer(question.id, selectedIndices)` — this commits to store → `isAnswered` becomes `true`
2. `SessionPlayPage` must store this callback ref via `setHandleMultiCheck`

**Reset on question change:** `SessionPlayPage` must reset `multiHasSelection = false` and `handleMultiCheck = null` when `currentQuestion.id` changes.

**Bottom bar render logic in `SessionPlayPage.tsx`:**

```tsx
const isMultiChoice = currentQuestion?.type === 'multi-choice';

// Check button (multi-choice, not yet answered)
{isMultiChoice && !isAnswered && (
  <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
    <Button
      className="w-full"
      disabled={!multiHasSelection}
      onClick={() => handleMultiCheck?.()}
    >
      {t('check', { ns: 'question' })}
    </Button>
  </div>
)}

// Desktop inline Check
{isMultiChoice && !isAnswered && (
  <div className="hidden lg:flex justify-end mt-2">
    <Button disabled={!multiHasSelection} onClick={() => handleMultiCheck?.()}>
      {t('check', { ns: 'question' })}
    </Button>
  </div>
)}

// Next button (answered — same as existing)
{isAnswered && ( /* existing code unchanged */ )}
```

### `useMultiChoiceQuestion` Hook — Full Specification

```typescript
export function useMultiChoiceQuestion(
  question: MultiChoiceQuestion,
  onSelectionChange: (hasSelection: boolean) => void,
  onCheckRegister: (checkFn: () => void) => void
)
```

**State:**
- `selectedIndices: number[]` — toggled on each option click
- `isChecked: boolean` — true after Check is tapped

**Key behaviours:**

1. Toggle on click:
```typescript
const onToggle = useCallback((index: number) => {
  if (isChecked) return; // locked after check
  setSelectedIndices(prev => {
    const next = prev.includes(index)
      ? prev.filter(i => i !== index)
      : [...prev, index];
    onSelectionChange(next.length > 0);
    return next;
  });
}, [isChecked, onSelectionChange]);
```

2. Check action:
```typescript
const onCheck = useCallback(() => {
  if (selectedIndices.length === 0 || isChecked) return;
  setIsChecked(true);
  setAnswer(question.id, selectedIndices);
}, [selectedIndices, isChecked, setAnswer, question.id]);
```

3. Register `onCheck` with parent (so SessionPlayPage can call it from its button):
```typescript
useEffect(() => {
  onCheckRegister(onCheck);
}, [onCheck, onCheckRegister]);
```

4. Reset on question change:
```typescript
useEffect(() => {
  setSelectedIndices([]);
  setIsChecked(false);
  onSelectionChange(false);
}, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps
```

5. Keyboard support: Space/Enter toggles focused option; no number key shortcut (multi-choice has no 1-1 mapping).

**Return:**
```typescript
return { selectedIndices, isChecked, onToggle };
```

### Correctness Evaluation

```typescript
const correctSet = new Set(question.correct); // number[]
const selectedSet = new Set(selectedIndices);

const isCorrectAnswer =
  question.correct.every(i => selectedSet.has(i)) &&
  selectedIndices.every(i => correctSet.has(i));
```

Store receives `selectedIndices` (the raw selection). **Summary/score computation** must use the above logic to classify the answer as correct. Verify that `sessionStore.setAnswer` already stores `number[]` without normalisation — it does, per existing schema.

### `AnswerOption` Changes — Minimal Diff

Current interface:
```typescript
interface AnswerOptionProps {
  index: number; text: string; isSelected: boolean;
  isAnswered: boolean; isCorrect: boolean; isDisabled: boolean;
  onSelect: () => void;
}
```

New interface (additive only — no breaking changes):
```typescript
interface AnswerOptionProps {
  index: number; text: string; isSelected: boolean;
  isAnswered: boolean; isCorrect: boolean; isDisabled: boolean;
  onSelect: () => void;
  variant?: 'radio' | 'checkbox'; // default: 'radio'
  isMissed?: boolean; // correct option user didn't select — default: false
}
```

Visual state matrix for checkbox variant:

| State | Background | Border | Icon |
|-------|-----------|--------|------|
| default | — | `border-border` | — |
| selected (pre-check) | `bg-primary/10` | `border-primary` | — |
| correct (selected + correct) | `bg-accent/10` | `border-accent` | ✓ |
| wrong (selected + incorrect) | `bg-error/10` | `border-error` | ✗ |
| missed (not selected + correct) | `bg-accent/10` | `border-accent` | — (no icon) |

The `disabled` condition for checkbox variant: options are NOT disabled after check (all remain visible). Set `isDisabled={false}` for all options in multi-choice after reveal (they are just locked via `isChecked` in the hook).

Role: `role="checkbox"` when `variant === 'checkbox'`, `role="radio"` otherwise (default).

### `MultiChoiceQuestion.tsx` — Component Structure

```tsx
interface Props {
  question: MultiChoiceQuestion;
  onSelectionChange: (hasSelection: boolean) => void;
  onCheckRegister: (checkFn: () => void) => void;
}

export const MultiChoiceQuestion: FC<Props> = ({ question, onSelectionChange, onCheckRegister }) => {
  const { selectedIndices, isChecked, onToggle } = useMultiChoiceQuestion(
    question, onSelectionChange, onCheckRegister
  );

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Answer options">
        {question.options.map((option, index) => {
          const isSelected = selectedIndices.includes(index);
          const isCorrectOption = question.correct.includes(index);
          const isMissed = isChecked && isCorrectOption && !isSelected;

          return (
            <AnswerOption
              key={index}
              index={index}
              text={option}
              variant="checkbox"
              isSelected={isSelected}
              isAnswered={isChecked}
              isCorrect={isCorrectOption}
              isMissed={isMissed}
              isDisabled={false} // never disabled in checkbox mode
              onSelect={() => onToggle(index)}
            />
          );
        })}
      </div>
      {isChecked && <ExplanationPanel explanation={question.explanation} />}
    </div>
  );
};
```

Note: `role="group"` (not `role="radiogroup"`) for checkbox semantics.

### `QuestionCard.tsx` — Updated Dispatch

```tsx
// In QuestionCard: receive and forward callbacks for multi-choice coordination
interface QuestionCardProps {
  onSelectionChange?: (hasSelection: boolean) => void;
  onCheckRegister?: (checkFn: () => void) => void;
}

export const QuestionCard: FC<QuestionCardProps> = ({ onSelectionChange, onCheckRegister }) => {
  // ... existing code ...
  {question.type === 'single-choice' && <SingleChoiceQuestion question={question} />}
  {question.type === 'multi-choice' && (
    <MultiChoiceQuestion
      question={question}
      onSelectionChange={onSelectionChange ?? (() => {})}
      onCheckRegister={onCheckRegister ?? (() => {})}
    />
  )}
};
```

### `useSessionPlayPage` — Changes

Add `currentQuestion` to the returned object (already computed inside the hook):

```typescript
return {
  isSetupLoading, isSetupError,
  questionCount: questionList.length,
  currentIndex,
  currentQuestion,  // ← add this
  isAnswered,
  handleNext,
  onRetry: refetch
};
```

### i18n — Keys to Add

**`public/locales/en/question.json`** — add after `explanation`:
```json
"check": "Check"
```

**`public/locales/ru/question.json`** — add after `explanation`:
```json
"check": "Проверить"
```

### File Structure

```
src/
  components/features/QuestionCard/
    AnswerOption/
      AnswerOption.tsx                 ← MODIFY (add variant, isMissed props)
    MultiChoice/                       ← NEW folder
      MultiChoiceQuestion.tsx          ← NEW
      useMultiChoiceQuestion.ts        ← NEW
      MultiChoiceQuestion.test.tsx     ← NEW
      index.ts                         ← NEW
    QuestionCard.tsx                   ← MODIFY (add multi-choice branch, accept callbacks)
  pages/SessionPlayPage/
    SessionPlayPage.tsx                ← MODIFY (Check button in sticky bar)
    useSessionPlayPage.ts              ← MODIFY (expose currentQuestion)
public/locales/en/question.json        ← MODIFY (add "check" key)
public/locales/ru/question.json        ← MODIFY (add "check" key)
```

No new stores, no new routes, no new pages.

---

## Testing Requirements

### `MultiChoiceQuestion.test.tsx`

**Test: renders in checkbox variant**
- Render with a multi-choice question fixture
- Assert: each option has `role="checkbox"`
- Assert: `role="group"` wraps options

**Test: toggles selection on click**
- Click option A → it becomes selected
- Click option A again → it deselects
- Click options A + B → both selected

**Test: Check button disabled until selection**
- Calls `onSelectionChange(false)` initially
- After clicking any option → `onSelectionChange(true)` called
- After deselecting all → `onSelectionChange(false)` called

**Test: answer evaluated correctly on check**
- Select all correct options, no wrong ones → `setAnswer` called with correct `number[]`
- After `setAnswer` called → `ExplanationPanel` renders

**Test: correct/wrong/missed highlighting after check**
- Mock question: `correct: [0, 2]`, user selects `[0, 1]`
  - Option 0: `isCorrect=true`, `isSelected=true` → accent (correct)
  - Option 1: `isCorrect=false`, `isSelected=true` → error (wrong)
  - Option 2: `isCorrect=true`, `isSelected=false` → `isMissed=true` → subtle accent (missed)
  - Option 3: `isCorrect=false`, `isSelected=false` → neutral

**Test: options remain interactive description after check (locked)**
- After check: clicking an option calls onToggle but hook guards with `isChecked` check
- `isDisabled=false` keeps all options visible (not greyed out)

**Test: resets on question change**
- Change question.id → selectedIndices cleared → onSelectionChange(false) called

### `AnswerOption` tests — regression check
- Existing tests must pass unchanged
- Add: `variant="checkbox"` → `role="checkbox"`
- Add: `isMissed=true` → `bg-accent/10` class present, no icon rendered

### Fixture for tests

```typescript
// src/test/fixtures/multiChoiceQuestion.ts (create if not exists)
import type { MultiChoiceQuestion } from '@/lib/data/schema';

export const makeMultiChoiceQuestion = (
  overrides: Partial<MultiChoiceQuestion> = {}
): MultiChoiceQuestion => ({
  id: 'mc-test-001',
  type: 'multi-choice',
  category: 'javascript',
  difficulty: 'medium',
  tags: ['test'],
  question: 'Select all correct answers',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correct: [0, 2],
  explanation: 'Options A and C are correct because...',
  ...overrides
});
```

---

## Project Context Reference

- Rules: read `.cursor/rules/` before implementing (engineering-standards, react-patterns, test-driven-development)
- Component pattern: always extract logic to `useComponentName.ts` hook
- Tailwind v4: no `tailwind.config.ts` — tokens in `src/index.css`; `bg-accent/10`, `border-accent`, `bg-error/10`, `border-error` are existing tokens
- i18n: `t('check', { ns: 'question' })` or use `useTranslation('question')` inside components
- Imports: `@/` alias only, no relative `../../`
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `capturedCheckFn!()` in tests required `act()` wrapper to flush React state update from `setIsChecked(true)` before assertions. Fixed by importing and using `act` from `@testing-library/react`.
- `render` import in MultiChoiceQuestion.test.tsx removed as unused (lint error) — `renderWithProviders` from test-utils covers all cases.

### Completion Notes List

- Extended `AnswerOption` with `variant: 'radio' | 'checkbox'` and `isMissed?: boolean` props. Zero regression on existing radio behaviour. 17 tests.
- Created `MultiChoiceQuestion` + `useMultiChoiceQuestion` with full toggle/check/reset logic. Callback pattern (`onSelectionChange`, `onCheckRegister`) coordinates state with `SessionPlayPage` without polluting the store. 14 tests.
- Updated `QuestionCard` to dispatch to `MultiChoiceQuestion` for `multi-choice` type, forwarding callbacks. 8 tests (1 new).
- Updated `SessionPlayPage` to render "Check" button (disabled until selection) via `useRef` for the check callback and `useState` for selection presence. "Next" button logic unchanged.
- Updated `useSessionPlayPage` to expose `currentQuestion` for type-based rendering in `SessionPlayPage`.
- Added i18n keys: `"check": "Check"` (EN) and `"check": "Проверить"` (RU).
- All 122 tests pass, lint clean, tsc clean.

### File List

- `src/components/features/QuestionCard/AnswerOption/AnswerOption.tsx` (modified)
- `src/components/features/QuestionCard/AnswerOption/AnswerOption.test.tsx` (new)
- `src/components/features/QuestionCard/MultiChoice/MultiChoiceQuestion.tsx` (new)
- `src/components/features/QuestionCard/MultiChoice/useMultiChoiceQuestion.ts` (new)
- `src/components/features/QuestionCard/MultiChoice/MultiChoiceQuestion.test.tsx` (new)
- `src/components/features/QuestionCard/MultiChoice/index.ts` (new)
- `src/components/features/QuestionCard/QuestionCard.tsx` (modified)
- `src/components/features/QuestionCard/QuestionCard.test.tsx` (modified)
- `src/pages/SessionPlayPage/SessionPlayPage.tsx` (modified)
- `src/pages/SessionPlayPage/useSessionPlayPage.ts` (modified)
- `public/locales/en/question.json` (modified)
- `public/locales/ru/question.json` (modified)
