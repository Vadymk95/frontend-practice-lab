# Story 3.1: Session Presets — Save & Relaunch

Status: done

## Story

As a **user**,
I want to save my current session configuration as a preset and relaunch it with one tap,
So that I can start my daily habit session without reconfiguring every morning.

## Acceptance Criteria

1. **Given** the user has configured a session in the SessionConfigurator
   **When** they tap "Save preset"
   **Then** a preset is saved via `StorageService.savePreset()` with a generated name (e.g. "JS+TS · medium · 50q") and current timestamp
   **And** the preset appears in the preset list on the home screen immediately

2. **Given** presets exist in storage
   **When** the home screen loads
   **Then** the preset list is shown with each preset displayed as a `PresetRow` (name, config summary, last-used date)

3. **Given** the user taps a `PresetRow`
   **When** the preset launches
   **Then** the session starts immediately with the preset config (skipping configurator re-entry)
   **And** the preset's last-used timestamp updates in storage

## Tasks / Subtasks

- [x] Task 1: Create `presetStore` (AC: #1, #2, #3)
  - [x] Create `src/store/presets/presetStore.ts` — Zustand store backed by `storageService.getPresets()`
  - [x] Add `presets: SessionPreset[]`, `savePreset(config, name)`, `updateLastUsed(id)` to store state
  - [x] `savePreset`: generate UUID id, set `createdAt`/`lastUsedAt` to current ISO timestamp, call `storageService.savePreset()`, update store
  - [x] `updateLastUsed`: find preset by id, update `lastUsedAt`, call `storageService.savePreset()`, update store
  - [x] Create `src/store/presets/index.ts` — re-export `usePresetStore`
  - [x] Create `src/store/presets/presetStore.test.ts` — test `savePreset` and `updateLastUsed`

- [x] Task 2: Create `PresetRow` component (AC: #2, #3)
  - [x] Create `src/components/features/PresetList/PresetRow/PresetRow.tsx` — UI only
  - [x] Create `src/components/features/PresetList/PresetRow/usePresetRow.ts` — logic: derive `configSummary` string from preset config, expose `handleLaunch`
  - [x] Create `src/components/features/PresetList/PresetRow/index.ts` — re-export
  - [x] `configSummary` format: `"${categories.slice(0,2).join('+')}${categories.length > 2 ? '+…' : ''} · ${difficulty} · ${questionCount}q"`
  - [x] `handleLaunch`: calls `presetStore.updateLastUsed(preset.id)`, sets `sessionStore.setConfig(preset.config)`, navigates to `RoutesPath.SessionPlay`
  - [x] Display: preset name as heading, `configSummary` below, `lastUsedAt` formatted as relative date

- [x] Task 3: Add preset list to HomePage (AC: #2, #3)
  - [x] Modify `src/pages/HomePage/index.tsx` to read `presets` from `usePresetStore`
  - [x] Render preset list BELOW the SessionConfigurator when presets exist
  - [x] When no presets: render nothing (no empty-state placeholder — Story 3.6 handles layout)

- [x] Task 4: Add "Save preset" button to SessionConfigurator (AC: #1)
  - [x] Modify `src/components/features/SessionConfigurator/useSessionConfigurator.ts` — add `handleSavePreset()`
  - [x] `handleSavePreset`: build `SessionConfig` from current state, generate preset name, call `presetStore.savePreset(config, name)`
  - [x] Preset name generation: `generatePresetName(config, categories)` — pure function, e.g. "JS+TS · medium · 50q"
  - [x] Modify `src/components/features/SessionConfigurator/SessionConfigurator.tsx` — add "Save preset" `Button variant="outline"` next to "Start Session" (only shown when `isStartEnabled`)
  - [x] Add i18n keys: `home.configurator.savePreset` in both `en/home.json` and `ru/home.json`

- [x] Task 5: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `presetStore.ts` — Implementation

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { storageService } from '@/lib/storage';
import type { SessionConfig, SessionPreset } from '@/lib/storage/types';
import { createSelectors } from '@/store/utils/createSelectors';

interface PresetState {
  presets: SessionPreset[];
  savePreset: (config: SessionConfig, name: string) => void;
  updateLastUsed: (id: string) => void;
}

const usePresetStoreBase = create<PresetState>()(
  devtools(
    (set, get) => ({
      presets: storageService.getPresets(),
      savePreset: (config: SessionConfig, name: string) => {
        const preset: SessionPreset = {
          id: crypto.randomUUID(),
          name,
          config,
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        };
        storageService.savePreset(preset);
        set({ presets: storageService.getPresets() }, false, { type: 'preset-store/savePreset' });
      },
      updateLastUsed: (id: string) => {
        const preset = get().presets.find(p => p.id === id);
        if (!preset) return;
        const updated = { ...preset, lastUsedAt: new Date().toISOString() };
        storageService.savePreset(updated);
        set({ presets: storageService.getPresets() }, false, { type: 'preset-store/updateLastUsed' });
      },
    }),
    { name: 'preset-store' }
  )
);

export const usePresetStore = createSelectors(usePresetStoreBase);
export { usePresetStoreBase };
```

**`SessionPreset` type already exists** in `src/lib/storage/types.ts`:
```typescript
export interface SessionPreset {
  id: string;
  name: string;
  config: SessionConfig;
  createdAt: string;
  lastUsedAt: string;
}
```

**`StorageService.savePreset()` is already implemented** in `src/lib/storage/LocalStorageService.ts` — upserts by id.

### Preset Name Generation

Pure utility function — can live in `useSessionConfigurator.ts` or a shared `src/lib/utils.ts` extension:

```typescript
export function generatePresetName(
  config: SessionConfig,
  categories: ManifestEntry[]
): string {
  const catSlugs = config.categories;
  const catLabels = categories
    .filter(c => catSlugs.includes(c.slug))
    .map(c => c.displayName);
  const catPart = catLabels.slice(0, 2).join('+') + (catLabels.length > 2 ? '+…' : '');
  return `${catPart} · ${config.difficulty} · ${config.questionCount}q`;
}
```

### `usePresetRow.ts` — Launch Flow

```typescript
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionPreset } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useSessionStore } from '@/store/session';

export function usePresetRow(preset: SessionPreset) {
  const navigate = useNavigate();
  const updateLastUsed = usePresetStore.use.updateLastUsed();
  const setConfig = useSessionStore.use.setConfig();

  const handleLaunch = useCallback(() => {
    updateLastUsed(preset.id);
    setConfig(preset.config);
    navigate(RoutesPath.SessionPlay);
  }, [preset, updateLastUsed, setConfig, navigate]);

  return { handleLaunch };
}
```

### `HomePage` — Preset List Integration

```typescript
// src/pages/HomePage/index.tsx
import { usePresetStore } from '@/store/presets';
import { PresetRow } from '@/components/features/PresetList/PresetRow';

export const HomePage: FC = () => {
  const presets = usePresetStore.use.presets();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
      <SessionConfigurator />
      {presets.length > 0 && (
        <div className="flex flex-col gap-2">
          {presets.map(p => <PresetRow key={p.id} preset={p} />)}
        </div>
      )}
    </div>
  );
};
```

### i18n Keys

**`public/locales/en/home.json`** — add to `configurator` object:
```json
"savePreset": "Save preset"
```

**`public/locales/ru/home.json`** (create if not exists):
```json
{
  "configurator": {
    "savePreset": "Сохранить пресет"
  }
}
```

Note: `ru/home.json` does NOT currently exist — create it.

### File Structure

```
src/store/presets/presetStore.ts    ← NEW
src/store/presets/index.ts          ← NEW
src/store/presets/presetStore.test.ts ← NEW
src/components/features/PresetList/PresetRow/PresetRow.tsx   ← NEW
src/components/features/PresetList/PresetRow/usePresetRow.ts ← NEW
src/components/features/PresetList/PresetRow/index.ts        ← NEW
src/pages/HomePage/index.tsx        ← MODIFY
src/components/features/SessionConfigurator/useSessionConfigurator.ts ← MODIFY
src/components/features/SessionConfigurator/SessionConfigurator.tsx   ← MODIFY
public/locales/en/home.json         ← MODIFY (add savePreset)
public/locales/ru/home.json         ← CREATE (only savePreset key needed)
```

### Architecture Compliance

- **Zustand store** — `createSelectors` pattern, devtools middleware, `preset-store/` dispatch names
- **Component pattern** — `PresetRow.tsx` (UI only) + `usePresetRow.ts` (all logic) + `index.ts` (re-export)
- **`@/` alias only** — no relative imports
- **i18n** — no hardcoded strings; `useTranslation('home')` namespace
- **`storageService` singleton** — already exported from `src/lib/storage/index.ts`

### Testing Strategy

```typescript
// presetStore.test.ts
describe('presetStore', () => {
  beforeEach(() => {
    usePresetStoreBase.setState({ presets: [] });
    localStorage.clear();
  });

  it('savePreset adds to presets list', () => {
    const config = { categories: ['js'], questionCount: 10, difficulty: 'all', mode: 'all', order: 'random' };
    usePresetStoreBase.getState().savePreset(config, 'JS · all · 10q');
    expect(usePresetStoreBase.getState().presets).toHaveLength(1);
    expect(usePresetStoreBase.getState().presets[0].name).toBe('JS · all · 10q');
  });

  it('updateLastUsed updates timestamp', () => {
    // seed preset
    const preset: SessionPreset = { id: 'p1', name: 'Test', config: { ... }, createdAt: '2026-01-01T00:00:00.000Z', lastUsedAt: '2026-01-01T00:00:00.000Z' };
    storageService.savePreset(preset);
    usePresetStoreBase.setState({ presets: [preset] });

    usePresetStoreBase.getState().updateLastUsed('p1');
    expect(usePresetStoreBase.getState().presets[0].lastUsedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });
});
```

---

## Previous Story Intelligence

### From Story 2.5

- **`useSessionStore.setState()`** in test `beforeEach` — required for isolation; always reset data fields only: `questionList, currentIndex, answers, skipList, config, timerMs`
- **`renderWithProviders`** — always use, never bare `render`
- **`Button` component** — import from `@/components/ui/button`
- **`createSelectors`** pattern — `export const usePresetStore = createSelectors(usePresetStoreBase)`
- **`storageService` singleton** — import from `@/lib/storage`

### Existing StorageService

`LocalStorageService.savePreset()` already upserts: finds by `id`, replaces if found, pushes if new. No need to delete + re-add.

---

## Architecture Compliance

- **FSD path aliases**: `@/store/presets`, `@/components/features/PresetList` — no relative `../../`
- **Zustand devtools** — all `set()` calls include `{ type: 'preset-store/actionName' }`
- **TypeScript strict** — no `any`, no implicit returns
- **Tailwind v4** — no `tailwind.config.ts`; use existing design tokens only

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `storageService` singleton: `src/lib/storage/index.ts` exports `export const storageService = new LocalStorageService()`
- `SessionPreset` type: `src/lib/storage/types.ts`
- `createSelectors`: `src/store/utils/createSelectors.ts`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Created `presetStore` (Zustand + devtools + createSelectors) backed by `storageService`
- `savePreset` generates UUID via `crypto.randomUUID()`, persists to localStorage, syncs store
- `updateLastUsed` finds preset by id, updates `lastUsedAt`, persists and syncs
- `PresetRow` — UI-only component with `usePresetRow` hook; `configSummary` derived from categories slugs, `handleLaunch` wires updateLastUsed → setConfig → navigate
- `HomePage` renders preset list below SessionConfigurator when presets exist
- `generatePresetName` pure function added to `useSessionConfigurator.ts`
- "Save preset" button appears next to "Start Session" only when `isStartEnabled`; both mobile sticky bar and desktop inline area updated
- i18n: `savePreset` key added to `en/home.json`; `ru/home.json` created
- 168 tests pass, 0 regressions

### File List

- `src/store/presets/presetStore.ts` (NEW)
- `src/store/presets/index.ts` (NEW)
- `src/store/presets/presetStore.test.ts` (NEW)
- `src/components/features/PresetList/PresetRow/PresetRow.tsx` (NEW)
- `src/components/features/PresetList/PresetRow/usePresetRow.ts` (NEW)
- `src/components/features/PresetList/PresetRow/index.ts` (NEW)
- `src/pages/HomePage/index.tsx` (MODIFIED)
- `src/components/features/SessionConfigurator/useSessionConfigurator.ts` (MODIFIED)
- `src/components/features/SessionConfigurator/SessionConfigurator.tsx` (MODIFIED)
- `public/locales/en/home.json` (MODIFIED)
- `public/locales/ru/home.json` (CREATED)

### Change Log

- 2026-04-09: Implemented Story 3.1 — Session Presets Save & Relaunch. Added presetStore, PresetRow component, preset list on HomePage, "Save preset" button in SessionConfigurator, i18n keys.
