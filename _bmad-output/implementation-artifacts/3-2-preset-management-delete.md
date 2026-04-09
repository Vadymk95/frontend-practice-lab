# Story 3.2: Preset Management — Delete

Status: ready-for-dev

## Story

As a **user**,
I want to delete individual saved presets,
So that I can keep my preset list clean without accumulating outdated configurations.

## Acceptance Criteria

1. **Given** presets exist in the preset list
   **When** the user taps the delete button on a `PresetRow`
   **Then** a confirmation `Dialog` appears: "Delete preset '[name]'?"
   **And** on confirm: preset is removed via `StorageService.deletePreset(id)` and the list updates immediately
   **And** on cancel: nothing changes

2. **Given** the last preset is deleted
   **When** the preset list is empty
   **Then** muted text "No saved presets yet" is shown — no illustration, no empty-state graphic

## Tasks / Subtasks

- [ ] Task 1: Install shadcn/ui Dialog component (AC: #1)
  - [ ] Run `npx shadcn@latest add dialog` from project root
  - [ ] Verify `src/components/ui/dialog.tsx` is created

- [ ] Task 2: Add `deletePreset` to `presetStore` (AC: #1)
  - [ ] Modify `src/store/presets/presetStore.ts` — add `deletePreset(id: string)` action
  - [ ] `deletePreset`: calls `storageService.deletePreset(id)`, reloads from storage: `set({ presets: storageService.getPresets() })`
  - [ ] Add `deletePreset` to `PresetState` interface
  - [ ] Add tests to `src/store/presets/presetStore.test.ts`

- [ ] Task 3: Add delete button and confirmation dialog to `PresetRow` (AC: #1)
  - [ ] Modify `src/components/features/PresetList/PresetRow/usePresetRow.ts` — add `isDeleteOpen`, `setIsDeleteOpen`, `handleDeleteRequest`, `handleDeleteConfirm`, `handleDeleteCancel`
  - [ ] `handleDeleteRequest`: sets `isDeleteOpen = true`
  - [ ] `handleDeleteConfirm`: calls `presetStore.deletePreset(preset.id)`, sets `isDeleteOpen = false`
  - [ ] `handleDeleteCancel`: sets `isDeleteOpen = false`
  - [ ] Modify `src/components/features/PresetList/PresetRow/PresetRow.tsx` — render delete icon button + Dialog
  - [ ] Dialog content: title "Delete preset?" + description "'[name]'" + Cancel + Delete buttons

- [ ] Task 4: Show empty state when all presets deleted (AC: #2)
  - [ ] Modify `src/pages/HomePage/index.tsx` — show empty state text when `presets.length === 0` AFTER at least one preset was saved
  - [ ] Actually: per AC, show "No saved presets yet" as muted text when list is empty. This is shown in the preset section area only when preset section has been rendered before. Simplest implementation: always show the empty state text when `presets.length === 0` in the preset section. Story 3.6 handles the no-preset-first-visit case (hiding the section entirely). For now: always show the text when empty.

- [ ] Task 5: Add i18n keys (AC: #1, #2)
  - [ ] `en/home.json` — add `presets.deleteDialog.title`, `presets.deleteDialog.description`, `presets.deleteDialog.confirm`, `presets.deleteDialog.cancel`, `presets.empty`
  - [ ] `ru/home.json` — same keys in Russian

- [ ] Task 6: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

## Dev Notes

### `presetStore.ts` — Add `deletePreset`

Add to `PresetState` interface:
```typescript
deletePreset: (id: string) => void;
```

Add to store implementation:
```typescript
deletePreset: (id: string) => {
  storageService.deletePreset(id);
  set({ presets: storageService.getPresets() }, false, { type: 'preset-store/deletePreset' });
},
```

### `usePresetRow.ts` — Full Update

```typescript
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionPreset } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useSessionStore } from '@/store/session';

export function usePresetRow(preset: SessionPreset) {
  const navigate = useNavigate();
  const updateLastUsed = usePresetStore.use.updateLastUsed();
  const deletePreset = usePresetStore.use.deletePreset();
  const setConfig = useSessionStore.use.setConfig();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleLaunch = useCallback(() => {
    updateLastUsed(preset.id);
    setConfig(preset.config);
    navigate(RoutesPath.SessionPlay);
  }, [preset, updateLastUsed, setConfig, navigate]);

  const handleDeleteRequest = useCallback(() => setIsDeleteOpen(true), []);
  const handleDeleteConfirm = useCallback(() => {
    deletePreset(preset.id);
    setIsDeleteOpen(false);
  }, [preset.id, deletePreset]);
  const handleDeleteCancel = useCallback(() => setIsDeleteOpen(false), []);

  return {
    handleLaunch,
    isDeleteOpen,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDeleteCancel,
  };
}
```

### `PresetRow.tsx` — Dialog Integration

```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

// In the JSX:
<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('presets.deleteDialog.title')}</DialogTitle>
      <DialogDescription>
        {t('presets.deleteDialog.description', { name: preset.name })}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={handleDeleteCancel}>
        {t('presets.deleteDialog.cancel')}
      </Button>
      <Button variant="destructive" onClick={handleDeleteConfirm}>
        {t('presets.deleteDialog.confirm')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Install Dialog first** — `npx shadcn@latest add dialog` — this creates `src/components/ui/dialog.tsx` with all primitives (DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter).

### i18n Keys

**`public/locales/en/home.json`** — add to root:
```json
"presets": {
  "empty": "No saved presets yet",
  "deleteDialog": {
    "title": "Delete preset?",
    "description": "\"{{name}}\" will be permanently removed.",
    "confirm": "Delete",
    "cancel": "Cancel"
  }
}
```

**`public/locales/ru/home.json`** — add same keys:
```json
"presets": {
  "empty": "Нет сохранённых пресетов",
  "deleteDialog": {
    "title": "Удалить пресет?",
    "description": "«{{name}}» будет удалён навсегда.",
    "confirm": "Удалить",
    "cancel": "Отмена"
  }
}
```

### Empty State in HomePage

```tsx
{presets.length > 0 ? (
  <div className="flex flex-col gap-2">
    {presets.map(p => <PresetRow key={p.id} preset={p} />)}
  </div>
) : (
  <p className="text-sm text-muted-foreground text-center">
    {t('presets.empty')}
  </p>
)}
```

Wait — AC says empty state shows only after list is empty. But Story 3.1 said "When no presets: render nothing". Story 3.2 changes that: "muted text 'No saved presets yet' is shown". So in this story, update `HomePage` to show the empty text (not the hidden section). Story 3.6 will further refine this for the "first visit" case.

### File Structure

```
src/components/ui/dialog.tsx                ← NEW (via shadcn add dialog)
src/store/presets/presetStore.ts            ← MODIFY (add deletePreset)
src/store/presets/presetStore.test.ts       ← MODIFY (add deletePreset tests)
src/components/features/PresetList/PresetRow/usePresetRow.ts ← MODIFY
src/components/features/PresetList/PresetRow/PresetRow.tsx   ← MODIFY
src/pages/HomePage/index.tsx                ← MODIFY (empty state)
public/locales/en/home.json                 ← MODIFY
public/locales/ru/home.json                 ← MODIFY
```

---

## Previous Story Intelligence

### From Story 3.1

- `presetStore` created with `savePreset` and `updateLastUsed` — build on this
- `PresetRow` component created with `usePresetRow` — extend, do not replace
- `storageService.deletePreset(id)` is already implemented in `LocalStorageService`
- Always `usePresetStoreBase.setState({ presets: [] }); localStorage.clear()` in test `beforeEach`

---

## Architecture Compliance

- **shadcn/ui Dialog** — use `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` — all exported from `src/components/ui/dialog.tsx`
- **No `any`** — TypeScript strict
- **`@/` alias only** — no relative imports
- **Destructive action styling** — `Button variant="destructive"` for the Delete confirm button

---

## Project Context Reference

- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`
- `storageService.deletePreset(id)`: `src/lib/storage/LocalStorageService.ts` — filters and re-writes `PRESETS` key

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
