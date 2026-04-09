# Story 4.6: Algorithm Transparency Widget

Status: ready-for-dev

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

- [ ] Task 1: Create `AlgorithmWidget` component (AC: #1, #2)
  - [ ] Create `src/components/features/AlgorithmWidget/AlgorithmWidget.tsx` — UI only
  - [ ] Create `src/components/features/AlgorithmWidget/useAlgorithmWidget.ts` — logic hook
  - [ ] Create `src/components/features/AlgorithmWidget/index.ts` — re-export

- [ ] Task 2: Implement `useAlgorithmWidget` logic (AC: #1, #2)
  - [ ] Read `errorRates` from `useProgressStore.use.errorRates()`
  - [ ] Read `categories` from `useCategories()` (manifest data for display names)
  - [ ] Filter: only categories with `errorRates[slug] > 0` (has prior data)
  - [ ] Sort by `errorRates[slug]` descending, take top 3
  - [ ] If no categories have `errorRate > 0`: return `{ topWeakCategories: [], hasData: false }`
  - [ ] Expose: `topWeakCategories: Array<{ slug: string; displayName: string; errorRate: number }>`, `hasData: boolean`
  - [ ] Expose: `handleTopicSelect(slug: string): void` — calls `onCategorySelect` callback

- [ ] Task 3: Wire `AlgorithmWidget` into `HomePage` (AC: #1, #2)
  - [ ] Import and render `AlgorithmWidget` in `src/pages/HomePage/index.tsx`
  - [ ] Placement: above `SessionConfigurator` (and above `PrimaryPresetCard`)
  - [ ] Hidden when `!hasData` (no prior session data — AC #2)
  - [ ] On topic tap: pre-select the category in `SessionConfigurator` — use existing `modifyConfig` pattern with a new state var, or add a separate `onCategoryAdd` callback

- [ ] Task 4: Add error rate badges to category chips (AC: #3)
  - [ ] Read `errorRates` from `useProgressStore` in `useSessionConfigurator.ts` (or in the category chip component)
  - [ ] In the category grid render: if `errorRates[category.slug] > 0.30`, show a small badge `"{Math.round(errorRates[slug] * 100)}%"`
  - [ ] Badge styling: `bg-destructive/20 text-destructive text-[10px] px-1 rounded` — subtle, non-alarming

- [ ] Task 5: Add i18n keys (AC: #1)
  - [ ] `public/locales/en/home.json` — add `algorithmWidget.title`, `algorithmWidget.tapToSelect`
  - [ ] `public/locales/ru/home.json` — same keys in Russian

- [ ] Task 6: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

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

_to be filled_

### Debug Log References

_none_

### Completion Notes List

_to be filled_

### Review Findings

_none yet_

### File List

- `src/components/features/AlgorithmWidget/AlgorithmWidget.tsx` — NEW
- `src/components/features/AlgorithmWidget/useAlgorithmWidget.ts` — NEW
- `src/components/features/AlgorithmWidget/index.ts` — NEW
- `src/pages/HomePage/index.tsx` — MODIFY
- `src/components/features/SessionConfigurator/useSessionConfigurator.ts` — MODIFY
- `src/components/features/SessionConfigurator/SessionConfigurator.tsx` — MODIFY
- `public/locales/en/home.json` — MODIFY
- `public/locales/ru/home.json` — MODIFY
