# Story 4.6: Algorithm Transparency Widget

Status: review

## Story

As a **user**,
I want to see which topics the algorithm recommends I focus on,
So that I can start my session with intention rather than picking categories blindly.

## Acceptance Criteria

1. **Given** the user has completed at least one prior session
   **When** the home screen loads
   **Then** the algorithm widget appears at the top of the SessionConfigurator showing up to 3 topics with the highest error rate
   **And** each topic shows its error rate badge (e.g. "Closures 61%")
   **And** tapping a topic pre-selects its category in the category grid

2. **Given** the user has no prior session data (first visit)
   **When** the home screen loads
   **Then** the algorithm widget is hidden — no empty state shown for it

3. **Given** a category's error rate is > 30%
   **When** the category grid renders
   **Then** a small error rate badge appears on that category chip (e.g. "React 48%")
   **And** categories below 30% show no badge

## Tasks / Subtasks

- [x] Task 1: Create `AlgorithmWidget` component (AC: #1, #2)
  - [x] Create `src/components/features/AlgorithmWidget/AlgorithmWidget.tsx` — UI only
  - [x] Create `src/components/features/AlgorithmWidget/useAlgorithmWidget.ts` — logic hook
  - [x] Create `src/components/features/AlgorithmWidget/index.ts` — re-export

- [x] Task 2: Implement `useAlgorithmWidget` logic (AC: #1, #2)
  - [x] Read `errorRates` from `useProgressStore.use.errorRates()`
  - [x] Read `categories` from `useCategories()` (manifest data for display names)
  - [x] Filter: only categories with `errorRates[slug] > 0` (has prior data)
  - [x] Sort by `errorRates[slug]` descending, take top 3
  - [x] If no categories have `errorRate > 0`: return `{ topWeakCategories: [], hasData: false }`
  - [x] Expose: `topWeakCategories: Array<{ slug: string; displayName: string; errorRate: number }>`, `hasData: boolean`
  - [x] Expose: `handleTopicSelect(slug: string): void` — calls `onCategorySelect` callback

- [x] Task 3: Wire `AlgorithmWidget` into `HomePage` (AC: #1, #2)
  - [x] Import and render `AlgorithmWidget` in `src/pages/HomePage/index.tsx`
  - [x] Placement: above `SessionConfigurator` (and above `PrimaryPresetCard`)
  - [x] Hidden when `!hasData` (no prior session data — AC #2)
  - [x] On topic tap: pre-select the category in `SessionConfigurator` — use existing `modifyConfig` pattern with a new state var, or add a separate `onCategoryAdd` callback

- [x] Task 4: Add error rate badges to category chips (AC: #3)
  - [x] Read `errorRates` from `useProgressStore` in `useSessionConfigurator.ts` (or in the category chip component)
  - [x] In the category grid render: if `errorRates[category.slug] > 0.30`, show a small badge `"{Math.round(errorRates[slug] * 100)}%"`
  - [x] Badge styling: `bg-destructive/20 text-destructive text-[10px] px-1 rounded` — subtle, non-alarming

- [x] Task 5: Add i18n keys (AC: #1)
  - [x] `public/locales/en/home.json` — add `algorithmWidget.title`, `algorithmWidget.tapToSelect`
  - [x] `public/locales/ru/home.json` — same keys in Russian

- [x] Task 6: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### Dependency on Story 4.2

`errorRates` in `progressStore` is only meaningful after Story 4.2 (`recordAnswer`) is implemented. Before that, `errorRates = {}` for all users. The widget correctly hides itself when `errorRates` is empty (AC #2 condition naturally handles this).

### `useAlgorithmWidget` Hook

```typescript
// src/components/features/AlgorithmWidget/useAlgorithmWidget.ts
import { useMemo } from 'react';
import { useProgressStore } from '@/store/progress';
import { useCategories } from '@/hooks/data/useCategories';

interface WeakCategory {
    slug: string;
    displayName: string;
    errorRate: number;
}

interface UseAlgorithmWidgetReturn {
    topWeakCategories: WeakCategory[];
    hasData: boolean;
}

export function useAlgorithmWidget(
    onCategorySelect: (slug: string) => void
): UseAlgorithmWidgetReturn & { handleTopicSelect: (slug: string) => void } {
    const errorRates = useProgressStore.use.errorRates();
    const { data: categories } = useCategories();

    const topWeakCategories = useMemo(() => {
        if (!categories) return [];
        return categories
            .filter((cat) => (errorRates[cat.slug] ?? 0) > 0)
            .map((cat) => ({
                slug: cat.slug,
                displayName: cat.displayName,
                errorRate: errorRates[cat.slug] ?? 0,
            }))
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, 3);
    }, [categories, errorRates]);

    const hasData = topWeakCategories.length > 0;

    const handleTopicSelect = (slug: string) => {
        onCategorySelect(slug);
    };

    return { topWeakCategories, hasData, handleTopicSelect };
}
```

### `AlgorithmWidget` Component

```tsx
// src/components/features/AlgorithmWidget/AlgorithmWidget.tsx
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlgorithmWidget } from './useAlgorithmWidget';

interface AlgorithmWidgetProps {
    onCategorySelect: (slug: string) => void;
}

export const AlgorithmWidget: FC<AlgorithmWidgetProps> = ({ onCategorySelect }) => {
    const { t } = useTranslation('home');
    const { topWeakCategories, hasData, handleTopicSelect } = useAlgorithmWidget(onCategorySelect);

    if (!hasData) return null;

    return (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-3">{t('algorithmWidget.title')}</p>
            <div className="flex flex-wrap gap-2">
                {topWeakCategories.map((cat) => (
                    <button
                        key={cat.slug}
                        onClick={() => handleTopicSelect(cat.slug)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-sm hover:bg-muted transition-colors"
                    >
                        <span>{cat.displayName}</span>
                        <span className="text-[11px] text-destructive font-medium">
                            {Math.round(cat.errorRate * 100)}%
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
```

### `HomePage` — Widget Integration

The `AlgorithmWidget` receives `onCategorySelect`. This needs to pre-select the category in `SessionConfigurator`. Simplest approach: pass a callback that updates `initialConfig` with the selected category added.

```tsx
// src/pages/HomePage/index.tsx
const [algorithmSelectedCategory, setAlgorithmSelectedCategory] = useState<string | null>(null);

// Build a modifyConfig that has the tapped category pre-selected
const widgetConfig = useMemo<SessionConfig | undefined>(() => {
    if (!algorithmSelectedCategory) return undefined;
    return {
        categories: [algorithmSelectedCategory],
        questionCount: 10,
        difficulty: 'all',
        mode: 'all',
        order: 'random',
    };
}, [algorithmSelectedCategory]);

// Pass widgetConfig as initialConfig to SessionConfigurator (merged with modifyConfig)
const effectiveConfig = modifyConfig ?? widgetConfig;
```

Use `key={modifyKey}` on `SessionConfigurator` (already implemented in Story 3.6) — same pattern.

### Error Rate Badges in Category Grid

In `SessionConfigurator.tsx` (or the inner category chip component), add error rate badge:

```tsx
// In the category map render:
const errorRate = errorRates[category.slug] ?? 0;
const showBadge = errorRate > 0.30;

<button key={cat.slug} className={cn('...', selected && '...')}>
    <span>{cat.displayName}</span>
    {showBadge && (
        <span className="ml-1 text-[10px] text-destructive">
            {Math.round(errorRate * 100)}%
        </span>
    )}
</button>
```

Read `errorRates` in `useSessionConfigurator`:
```typescript
const errorRates = useProgressStore.use.errorRates();
// expose errorRates in return value
```

### `useCategories` Hook Return Shape

Check `src/hooks/data/useCategories.ts` for the shape of `data` — it returns `CategoryMeta[]` with `slug` and `displayName` from `manifest.json`. Use the same type.

### i18n Keys

**`public/locales/en/home.json`** — add:
```json
"algorithmWidget": {
  "title": "Focus areas based on your history",
  "tapToSelect": "Tap to select"
}
```

**`public/locales/ru/home.json`** — add:
```json
"algorithmWidget": {
  "title": "Слабые темы по истории ответов",
  "tapToSelect": "Нажмите для выбора"
}
```

### Files to Create / Modify

```
src/components/features/AlgorithmWidget/AlgorithmWidget.tsx  ← NEW
src/components/features/AlgorithmWidget/useAlgorithmWidget.ts ← NEW
src/components/features/AlgorithmWidget/index.ts             ← NEW
src/pages/HomePage/index.tsx                                 ← ADD AlgorithmWidget + onCategorySelect handler
src/components/features/SessionConfigurator/
  useSessionConfigurator.ts                                   ← ADD errorRates read + expose
  SessionConfigurator.tsx                                     ← ADD error rate badges on category chips
public/locales/en/home.json                                  ← ADD algorithmWidget keys
public/locales/ru/home.json                                  ← ADD algorithmWidget keys
```

---

## Architecture Compliance

- **Component pattern**: `AlgorithmWidget.tsx` (UI) + `useAlgorithmWidget.ts` (logic) + `index.ts` (re-export)
- **`progressStore` read-only** from component layer — no writes from `AlgorithmWidget`
- **Hidden when no data** — `return null` from component (no empty state per AC #2)
- **`@/` alias only** — no relative imports
- **Tailwind v4** — no `tailwind.config.ts`; use CSS variables and utility classes only

---

## Previous Story Intelligence

### From Story 3.6

- `HomePage` already has `modifyConfig` + `modifyKey` pattern for pre-filling `SessionConfigurator`
- `PrimaryPresetCard` placed above `SessionConfigurator` — `AlgorithmWidget` goes above `PrimaryPresetCard`

### From Story 4.2

- `progressStore.errorRates` populated only after `recordAnswer` runs on session complete
- Widget hidden on first visit (`errorRates = {}`) — natural behavior

---

## Project Context Reference

- `useCategories` in `src/hooks/data/useCategories.ts` — returns `CategoryMeta[]` from manifest
- `useProgressStore.use.errorRates()` — `Record<string, number>` (category slug → error rate 0-1)
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Created `AlgorithmWidget` component (AlgorithmWidget.tsx + useAlgorithmWidget.ts + index.ts) — reads `errorRates` from `progressStore`, filters categories with >0 error rate, sorts descending, exposes top 3. Returns null when no data (AC #2).
- Wired `AlgorithmWidget` into `HomePage/index.tsx` above `PrimaryPresetCard` — `handleAlgorithmCategorySelect` callback pre-fills `SessionConfigurator` via existing `modifyConfig`/`modifyKey` pattern.
- Added `errorRates` read to `useSessionConfigurator.ts` (from `useProgressStore`) and exposed in return value.
- Added error rate badges in `SessionConfigurator.tsx` category grid: visible when `errorRate > 0.30`, styled `bg-destructive/20 text-destructive text-[10px] px-1 rounded`.
- Added i18n keys `algorithmWidget.title` / `algorithmWidget.tapToSelect` to both en/ru home.json.
- All 250 tests pass, lint clean, tsc clean, format clean.

### Review Findings

_none yet_

### Change Log

- feat(4.6): algorithm transparency widget — AlgorithmWidget, error rate badges, i18n (2026-04-10)

### File List

- `src/components/features/AlgorithmWidget/AlgorithmWidget.tsx` — NEW
- `src/components/features/AlgorithmWidget/useAlgorithmWidget.ts` — NEW
- `src/components/features/AlgorithmWidget/index.ts` — NEW
- `src/pages/HomePage/index.tsx` — MODIFY
- `src/components/features/SessionConfigurator/useSessionConfigurator.ts` — MODIFY
- `src/components/features/SessionConfigurator/SessionConfigurator.tsx` — MODIFY
- `public/locales/en/home.json` — MODIFY
- `public/locales/ru/home.json` — MODIFY
