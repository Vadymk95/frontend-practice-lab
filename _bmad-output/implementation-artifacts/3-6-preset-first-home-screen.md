# Story 3.6: Preset-First Home Screen

Status: done

## Story

As a **user**,
I want presets to be the primary call-to-action on the home screen,
So that my daily session starts with one tap instead of reconfiguring every time.

## Acceptance Criteria

1. **Given** at least one preset exists
   **When** the home screen loads
   **Then** the most recently used preset is shown as the primary CTA above the configurator
   **And** the preset card shows: name, config summary, and a prominent "Start" button
   **And** a "Modify" link opens the SessionConfigurator pre-filled with the preset config

2. **Given** no presets exist (first visit)
   **When** the home screen loads
   **Then** the SessionConfigurator is shown directly with no preset section
   **And** no empty-state placeholder for presets — the configurator fills the space naturally

3. **Given** multiple presets exist
   **When** the home screen loads
   **Then** the most recently used is shown as primary; remaining presets are listed below as `PresetRow` components

## Tasks / Subtasks

- [x] Task 1: Sort presets by `lastUsedAt` in `usePresetStore` or at consumption point (AC: #1, #3)
  - [x] The `presets` array in `presetStore` is stored in insertion order
  - [x] Derive `sortedPresets = [...presets].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))` at the consumption point (in `HomePage` or a new hook)
  - [x] `mruPreset = sortedPresets[0]` (most recently used)
  - [x] `secondaryPresets = sortedPresets.slice(1)` (remaining presets)

- [x] Task 2: Create `PrimaryPresetCard` component (AC: #1)
  - [x] Create `src/components/features/PresetList/PrimaryPresetCard/PrimaryPresetCard.tsx` — UI only
  - [x] Create `src/components/features/PresetList/PrimaryPresetCard/usePrimaryPresetCard.ts` — logic
  - [x] Create `src/components/features/PresetList/PrimaryPresetCard/index.ts` — re-export
  - [x] `usePrimaryPresetCard(preset)`: expose `configSummary`, `handleStart`, `handleModify`
  - [x] `handleStart`: `presetStore.updateLastUsed(preset.id)`, `sessionStore.setConfig(preset.config)`, navigate to `RoutesPath.SessionPlay`
  - [x] `handleModify`: sets configurator to preset config state (see dev notes below) + scrolls/focuses configurator

- [x] Task 3: Refactor `HomePage` layout — preset-first structure (AC: #1, #2, #3)
  - [x] Modify `src/pages/HomePage/index.tsx`
  - [x] When `presets.length > 0`:
    - Show `PrimaryPresetCard` for MRU preset at the top
    - Show `SessionConfigurator` below (collapsed/secondary or shown as always)
    - Show remaining presets as `PresetRow` list below configurator
  - [x] When `presets.length === 0`:
    - Show only `SessionConfigurator` (no preset section, no empty state — Story 3.2 empty state applies only when presets existed)
  - [x] Remove the empty state text added in Story 3.2 when `presets.length === 0` AND no presets have ever been saved — OR simplify: only show preset section when `presets.length > 0`, never show empty state on first visit

- [x] Task 4: Implement "Modify" — pre-fill SessionConfigurator (AC: #1)
  - [x] `SessionConfigurator` needs to accept initial config values via props or via a shared state signal
  - [x] Approach: add `initialConfig?: SessionConfig` prop to `SessionConfigurator` component
  - [x] `useSessionConfigurator` accepts `initialConfig?: SessionConfig` and initializes state from it in `useState`:
    - `useState(initialConfig?.categories ?? [])`
    - `useState(initialConfig?.difficulty ?? 'all')`
    - `useState(initialConfig?.mode ?? 'all')`
    - `useState(initialConfig?.questionCount ?? 10)`
    - `useState(initialConfig?.order ?? 'random')`
  - [x] `HomePage` passes `initialConfig` from `handleModify` via a state variable `modifyConfig`

- [x] Task 5: Add i18n keys (AC: #1)
  - [x] `public/locales/en/home.json` — add `presets.primaryCard.start`, `presets.primaryCard.modify`
  - [x] `public/locales/ru/home.json` — same keys in Russian

- [x] Task 6: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `HomePage` — Layout Implementation

```typescript
// src/pages/HomePage/index.tsx
import { useState, useMemo } from 'react';
import type { SessionConfig } from '@/lib/storage/types';
import { usePresetStore } from '@/store/presets';
import { SessionConfigurator } from '@/components/features/SessionConfigurator';
import { PrimaryPresetCard } from '@/components/features/PresetList/PrimaryPresetCard';
import { PresetRow } from '@/components/features/PresetList/PresetRow';

export const HomePage: FC = () => {
  const presets = usePresetStore.use.presets();
  const [modifyConfig, setModifyConfig] = useState<SessionConfig | undefined>(undefined);

  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)),
    [presets]
  );

  const mruPreset = sortedPresets[0];
  const secondaryPresets = sortedPresets.slice(1);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
      {mruPreset && (
        <PrimaryPresetCard
          preset={mruPreset}
          onModify={(config) => setModifyConfig(config)}
        />
      )}
      <SessionConfigurator initialConfig={modifyConfig} />
      {secondaryPresets.length > 0 && (
        <div className="flex flex-col gap-2">
          {secondaryPresets.map(p => <PresetRow key={p.id} preset={p} />)}
        </div>
      )}
    </div>
  );
};
```

### `usePrimaryPresetCard.ts`

```typescript
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionConfig, SessionPreset } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useSessionStore } from '@/store/session';

export function usePrimaryPresetCard(
  preset: SessionPreset,
  onModify: (config: SessionConfig) => void
) {
  const navigate = useNavigate();
  const updateLastUsed = usePresetStore.use.updateLastUsed();
  const setConfig = useSessionStore.use.setConfig();

  const handleStart = useCallback(() => {
    updateLastUsed(preset.id);
    setConfig(preset.config);
    navigate(RoutesPath.SessionPlay);
  }, [preset, updateLastUsed, setConfig, navigate]);

  const handleModify = useCallback(() => {
    onModify(preset.config);
  }, [preset.config, onModify]);

  // Config summary — same format as PresetRow
  const configSummary = preset.name; // name already encodes config summary

  return { configSummary, handleStart, handleModify };
}
```

### `SessionConfigurator` — `initialConfig` Prop

Minimal change to existing `useSessionConfigurator`:
```typescript
export function useSessionConfigurator(initialConfig?: SessionConfig) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialConfig?.categories ?? []
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialConfig?.difficulty ?? 'all'
  );
  const [mode, setMode] = useState<Mode>(initialConfig?.mode ?? 'all');
  const [questionCount, setQuestionCount] = useState<number>(
    initialConfig?.questionCount ?? 10
  );
  const [order, setOrder] = useState<Order>(initialConfig?.order ?? 'random');
  // ...rest unchanged
}
```

And `SessionConfigurator.tsx` signature:
```typescript
interface SessionConfiguratorProps {
  initialConfig?: SessionConfig;
}

export const SessionConfigurator: FC<SessionConfiguratorProps> = ({ initialConfig }) => {
  const { ...hookResult } = useSessionConfigurator(initialConfig);
  // ...rest unchanged
};
```

**Important**: `useState` only reads initial value once (on mount). When `modifyConfig` changes in `HomePage`, `SessionConfigurator` needs to remount to pick up the new initial values. Use `key={modifyConfig ? modifyConfig.categories.join(',') : 'default'}` on the `SessionConfigurator` in `HomePage` to force remount when modify is triggered.

```tsx
<SessionConfigurator
  key={modifyConfig ? JSON.stringify(modifyConfig) : 'default'}
  initialConfig={modifyConfig}
/>
```

### Empty State Reconciliation (Stories 3.2 vs 3.6)

- Story 3.2 added empty state "No saved presets yet" when list is empty
- Story 3.6 AC#2 says "no empty-state placeholder for presets — the configurator fills the space naturally" on first visit

**Resolution**: Show preset section (including empty state) ONLY when presets have been seen. Simplest approach: show the preset section (with PresetRow list OR empty state from 3.2) only when `presets.length > 0`. For first visit where `presets.length === 0`, show only the configurator — no empty state, no section header.

This means modifying `HomePage` to conditionally render the empty state: show it only when `presets.length === 0 && previouslyHadPresets`. This requires tracking "had presets" state. **Pragmatic simplification**: just remove the empty state from `HomePage` entirely. The empty state was to inform users who deleted presets — they'll see an empty area below the configurator which is fine. The configurator fills the page on first visit naturally.

Or: keep the Story 3.2 empty state but wrap the entire preset section (including empty state) in `{presets.length > 0 || hadPresets ? ... : null}` where `hadPresets = storageService.getPresets()` was non-empty at load time. This is over-engineered — just check `presets.length > 0` and don't show empty state at all.

**Final decision**: Show `PrimaryPresetCard` + secondary list ONLY when `presets.length > 0`. No empty state. The empty state from Story 3.2 applied to the delete flow — after deleting all presets, the area simply disappears and the configurator expands naturally.

### i18n Keys

**`public/locales/en/home.json`** — add to `presets`:
```json
"primaryCard": {
  "start": "Start",
  "modify": "Modify"
}
```

**`public/locales/ru/home.json`** — add:
```json
"primaryCard": {
  "start": "Начать",
  "modify": "Изменить"
}
```

### File Structure

```
src/components/features/PresetList/PrimaryPresetCard/PrimaryPresetCard.tsx  ← NEW
src/components/features/PresetList/PrimaryPresetCard/usePrimaryPresetCard.ts ← NEW
src/components/features/PresetList/PrimaryPresetCard/index.ts               ← NEW
src/pages/HomePage/index.tsx                                                 ← MODIFY
src/components/features/SessionConfigurator/SessionConfigurator.tsx          ← MODIFY (add initialConfig prop)
src/components/features/SessionConfigurator/useSessionConfigurator.ts        ← MODIFY (accept initialConfig)
public/locales/en/home.json                                                  ← MODIFY
public/locales/ru/home.json                                                  ← MODIFY
```

---

## Previous Story Intelligence

### From Story 3.1

- `presetStore.updateLastUsed(id)` already implemented
- `PresetRow` component exists with `handleLaunch`
- `storageService.getPresets()` returns presets in insertion order — sort by `lastUsedAt` at consumption point

### From Story 3.2

- `presetStore.deletePreset(id)` already implemented
- When all presets deleted, `presets.length === 0` — home screen shows only configurator (Story 3.6 AC#2 satisfied)

---

## Architecture Compliance

- **Component pattern**: `PrimaryPresetCard.tsx` (UI) + `usePrimaryPresetCard.ts` (logic) + `index.ts` (re-export)
- **`useState` initial value caveat** — `useState(initial)` only uses initial value on mount; use `key` on `SessionConfigurator` to force remount on modify
- **`@/` alias only** — no relative imports
- **Tailwind v4** — no `tailwind.config.ts`

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `SessionPreset.lastUsedAt` is ISO timestamp string — `localeCompare` works for ISO sort (lexicographic)
- `createSelectors` pattern: `src/store/utils/createSelectors.ts`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Sorting by `lastUsedAt` implemented via `useMemo` in `HomePage` (ISO string lexicographic sort)
- `PrimaryPresetCard` component created with `usePrimaryPresetCard` hook: exposes `configSummary`, `handleStart`, `handleModify`
- `handleStart` calls `updateLastUsed` + `setConfig` + navigate to SessionPlay
- `handleModify` calls `onModify(preset.config)` which sets `modifyConfig` state in `HomePage`
- `SessionConfigurator` now accepts `initialConfig?: SessionConfig` prop; `key={JSON.stringify(modifyConfig)}` forces remount on modify trigger
- Empty state from Story 3.2 removed — preset section only shown when `presets.length > 0`
- i18n keys added: `presets.primaryCard.start` / `presets.primaryCard.modify` in EN + RU
- All 187 tests pass, lint clean, TypeScript clean

### Review Findings

- [x] [Review][Patch] Counter key for SessionConfigurator remount — `JSON.stringify(modifyConfig)` replaced with `modifyKey` counter; clicking "Modify" on the same preset twice now correctly resets the configurator [src/pages/HomePage/index.tsx]
- [x] [Review][Patch] configSummary IIFE showed raw slugs instead of display names — removed redundant subtitle from `PrimaryPresetCard` (preset.name already encodes the summary) and from `PresetRow`; DRY violation eliminated [usePrimaryPresetCard.ts, PrimaryPresetCard.tsx, usePresetRow.ts, PresetRow.tsx]
- [x] [Review][Patch] handleStart dependency array narrowed from entire `preset` object to `preset.id, preset.config` [usePrimaryPresetCard.ts]
- [x] [Review][Defer] "Modify" button is bare `<button>` vs `<Button>` component — intentional: secondary action styled as link [PrimaryPresetCard.tsx] — deferred, pre-existing design intent
- [x] [Review][Defer] localeCompare on lastUsedAt without null guard — TypeScript strict mode guarantees string type from store [HomePage/index.tsx] — deferred, TypeScript invariant holds
- [x] [Review][Defer] Zero questionCount defense in preset — store prevents invalid state upstream — deferred, pre-existing

### File List

- `src/components/features/PresetList/PrimaryPresetCard/PrimaryPresetCard.tsx` — NEW
- `src/components/features/PresetList/PrimaryPresetCard/usePrimaryPresetCard.ts` — NEW
- `src/components/features/PresetList/PrimaryPresetCard/index.ts` — NEW
- `src/pages/HomePage/index.tsx` — MODIFIED
- `src/components/features/SessionConfigurator/SessionConfigurator.tsx` — MODIFIED
- `src/components/features/SessionConfigurator/useSessionConfigurator.ts` — MODIFIED
- `src/components/features/PresetList/PresetRow/usePresetRow.ts` — MODIFIED (review fix: remove configSummary)
- `src/components/features/PresetList/PresetRow/PresetRow.tsx` — MODIFIED (review fix: remove configSummary subtitle)
- `public/locales/en/home.json` — MODIFIED
- `public/locales/ru/home.json` — MODIFIED
