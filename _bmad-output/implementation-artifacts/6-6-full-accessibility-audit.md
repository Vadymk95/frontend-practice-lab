# Story 6.6: Full Accessibility Audit & Keyboard Navigation

Status: ready-for-dev

## Story

As a **user**,
I want to navigate the entire app with a keyboard and have screen reader support,
so that the app is usable without a mouse and meets WCAG AA standards.

## Acceptance Criteria

1. **Given** the user navigates with Tab/Shift+Tab
   **When** focus moves between interactive elements
   **Then** every focusable element shows a visible focus ring: `outline-2 outline-accent-alt outline-offset-2`
   **And** focus order is logical and matches visual reading order

2. **Given** the user is on the question page using keyboard only
   **When** keys 1–4 are pressed
   **Then** the corresponding answer option is selected; Enter confirms/advances; Space toggles checkboxes for multi-choice

3. **Given** a skip link is present in `AppShell`
   **When** a keyboard user activates it
   **Then** focus jumps directly to `#main-content`

4. **Given** `axe-core` runs in CI via Vitest
   **When** all component tests execute
   **Then** zero accessibility violations are reported for all rendered components

## Tasks / Subtasks

- [ ] Task 1: Install `axe-core` and `@axe-core/react` for a11y testing (AC: #4)
  - [ ] `npm install -D axe-core @axe-core/react`
  - [ ] Alternatively use `vitest-axe` or `jest-axe` — check compatibility with Vitest 4 first
  - [ ] Add axe helper to `src/test/test-utils.tsx` or create `src/test/a11y.ts`

- [ ] Task 2: Audit and fix focus ring styles across all interactive elements (AC: #1)
  - [ ] Global rule in `src/index.css` for `:focus-visible`
  - [ ] Check existing buttons in `AppHeader`, `SessionPlayPage`, `HomePage`, `SummaryPage`
  - [ ] Existing buttons use `focus-visible:ring-2 focus-visible:ring-accent-alt` — verify consistency
  - [ ] Ensure `outline-offset-2` is present where rings are clipped by parent overflow

- [ ] Task 3: Add skip link to `AppShell` (AC: #3)
  - [ ] Add `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>` at top of shell
  - [ ] Add `id="main-content"` to the `<main>` element in the layout
  - [ ] i18n key `skipToContent` already exists in `common.json` — use it

- [ ] Task 4: Implement keyboard shortcuts for question page (AC: #2)
  - [ ] Create `useQuestionKeyboard.ts` hook (TDD required — >10 lines of logic)
  - [ ] Listen for `keydown` events on `document`: keys `1`–`4` select answer options
  - [ ] `Enter` confirms/advances (same as clicking the submit/next button)
  - [ ] `Space` toggles checkbox for multi-choice questions
  - [ ] Attach/detach listener in `useEffect` — clean up on unmount
  - [ ] Hook takes `options: AnswerOption[]`, `onSelect: (idx: number) => void`, `onSubmit: () => void`

- [ ] Task 5: Run axe-core in existing component tests (AC: #4)
  - [ ] Add axe check to `AppHeader.test.tsx`, `HomePage` test, `SessionPlayPage` test, `SummaryPage` test
  - [ ] Fix any violations found during the audit

- [ ] Task 6: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

## Dev Notes

### axe-core Integration with Vitest

**Recommended approach: `vitest-axe`** — designed for Vitest:

```bash
npm install -D vitest-axe
```

```typescript
// src/test/a11y.ts
import { axe, toHaveNoViolations } from 'vitest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

export { axe };
```

Usage in tests:

```typescript
import { renderWithProviders } from '@/test/test-utils';
import { axe } from '@/test/a11y';
import { AppHeader } from '@/components/layout/AppHeader';

it('AppHeader has no accessibility violations', async () => {
    const { container } = renderWithProviders(<AppHeader />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
});
```

If `vitest-axe` has peer dep issues with Vitest 4, fall back to `jest-axe` with `import { axe, toHaveNoViolations } from 'jest-axe'` — it works with Vitest too.

### Skip Link — Exact Pattern

```tsx
// AppShell or root layout — first child in <body>
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:ring-2 focus:ring-accent-alt"
>
  {t('skipToContent')}
</a>
```

`skipToContent` key already exists in `public/locales/en/common.json` as `"Skip to main content"`. Use it — don't add a new key.

Ensure `<main id="main-content">` wraps the page content in `AppShell`.

### Focus Ring — Global Baseline

Add to `src/index.css` as a global rule to ensure consistency:

```css
/* Ensure focus-visible ring across all interactive elements */
:focus-visible {
    outline: 2px solid var(--color-accent-alt);
    outline-offset: 2px;
}

/* Remove default outline since we handle it with Tailwind focus-visible: classes */
:focus:not(:focus-visible) {
    outline: none;
}
```

This handles any element not explicitly styled. Existing Tailwind `focus-visible:ring-2 focus-visible:ring-accent-alt` classes take precedence for specific elements.

### Keyboard Shortcuts for Question Page

```typescript
// src/hooks/ui/useQuestionKeyboard.ts
interface UseQuestionKeyboardProps {
    optionCount: number;
    onSelectOption: (idx: number) => void;
    onSubmit: () => void;
    isAnswered: boolean;  // prevent re-selection after answer is shown
}

export const useQuestionKeyboard = ({
    optionCount,
    onSelectOption,
    onSubmit,
    isAnswered
}: UseQuestionKeyboardProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't fire shortcuts when user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= optionCount && !isAnswered) {
                e.preventDefault();
                onSelectOption(num - 1); // convert 1-indexed to 0-indexed
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [optionCount, onSelectOption, onSubmit, isAnswered]);
};
```

**TDD required** — hook has >10 lines. Write tests first:

```typescript
// useQuestionKeyboard.test.ts
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('useQuestionKeyboard', () => {
    it('calls onSelectOption(0) when key "1" is pressed', () => { ... });
    it('calls onSelectOption(3) when key "4" is pressed', () => { ... });
    it('calls onSubmit when Enter is pressed', () => { ... });
    it('does not select option when isAnswered is true', () => { ... });
    it('does not fire when typing in an input element', () => { ... });
});
```

### Integration Point for Keyboard Hook

Find the question answer component in `src/pages/SessionPlayPage/` or `src/components/features/`. Look for where `onSelectOption` and submit logic live. Wire `useQuestionKeyboard` there.

Search for `src/components/features/` directories with "question" or "answer" in the name.

### ARIA Requirements

Verify these exist in question components:
- Answer options: `role="radio"` (single-choice) or `role="checkbox"` (multi-choice)
- Option group: `role="radiogroup"` or `role="group"` with `aria-labelledby`
- Correct/incorrect feedback: `role="alert"` so screen readers announce result
- Code blocks: `role="region"` + `aria-label="Code snippet"` (in Shiki renderer)

shadcn/ui components handle most of this by default — verify they haven't been overridden.

### Focus Management During Navigation

When navigating to a new question:
1. Move focus to the question card/heading — prevents screen reader from being lost
2. Pattern: `useEffect(() => { questionRef.current?.focus(); }, [questionIndex]);`

Search for `SessionPlayPage` and question components to find the right location.

### Minimum Tap Target (NFR6)

Check all button elements have `min-h-[44px] min-w-[44px]` or equivalent. This is a visual audit — scan `AppHeader`, session controls, answer option buttons.

### Architecture Compliance Checklist

- `useQuestionKeyboard` follows hook pattern: arrow function in `src/hooks/ui/`
- TDD for keyboard hook (> 10 lines)
- Clean up `addEventListener` in `useEffect` return
- No `any` in event handlers — use `KeyboardEvent`
- Skip link uses existing `skipToContent` i18n key (don't create new keys)

### References

- `src/index.css` — global styles + dark mode tokens
- `src/test/test-utils.tsx` — `renderWithProviders` for tests
- `public/locales/en/common.json` — `skipToContent` key (already present)
- `src/components/layout/AppHeader/AppHeader.tsx` — existing focus-visible pattern
- Architecture doc §Accessibility — WCAG AA requirements
- `src/pages/SessionPlayPage/` — keyboard shortcut integration point
- `vitest-axe` npm package — axe-core Vitest integration
