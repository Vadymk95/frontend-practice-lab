# Story 6.2: RU/EN Language Toggle

Status: ready-for-dev

## Story

As a **user**,
I want to switch the interface language between Russian and English,
so that I can use the app in my preferred language.

## Acceptance Criteria

1. **Given** the user opens the app for the first time
   **When** the app loads
   **Then** Russian (`ru`) is the active language and `document.documentElement.lang` is set to `"ru"`

2. **Given** the user taps the language toggle in `AppHeader`
   **When** the toggle fires
   **Then** `uiStore.setLanguage()` is called and `storageService.setLanguage()` persists the value
   **And** `i18next.changeLanguage()` switches to the selected locale immediately — no page reload
   **And** `document.documentElement.lang` updates to `"en"` or `"ru"`
   **And** all UI strings update via `t()` — no hardcoded text remains visible

3. **Given** any question is displayed in either language
   **When** the question renders
   **Then** code snippets always display in English regardless of active locale (FR51)

4. **Given** the user reloads the app
   **When** the app initialises
   **Then** the previously selected language is restored

## Tasks / Subtasks

- [ ] Task 1: Wire language toggle in `AppHeader` (AC: #2, #4)
  - [ ] Read `language` from `useUiStore.use.language()`
  - [ ] On click: call `uiStore.setLanguage()` + `i18next.changeLanguage()` to keep store + i18n in sync
  - [ ] Update button label: show `'EN'` when current is `'ru'`, show `'RU'` when current is `'en'` (indicates what you'd switch TO, or shows current — pick one convention and stick to it; current label is `t('header.languageLabel')` which returns `'EN'`)
  - [ ] Update `aria-label`: `t('header.toggleLanguage')`

- [ ] Task 2: Verify `document.documentElement.lang` updates on change (AC: #1, #2)
  - [ ] Confirm `i18next.on('languageChanged')` handler in `src/lib/i18n/index.ts` sets `document.documentElement.lang`
  - [ ] This is already implemented — verify it works (no code change needed if already wired)

- [ ] Task 3: Verify default language is Russian (AC: #1)
  - [ ] `i18next` detection order: `localStorage` → `navigator` → fallback `'en'`
  - [ ] `storageService.getLanguage()` fallback is `'ru'`
  - [ ] AC says default is Russian — if i18next falls back to `'en'`, this is a conflict. Resolution: set `fallbackLng: 'ru'` in `src/lib/i18n/index.ts` OR pre-populate localStorage on first visit

- [ ] Task 4: Update i18n keys for language label (AC: #2)
  - [ ] `header.languageLabel` currently `'EN'` — update to show the active language or the toggle target
  - [ ] Add both `en` and `ru` variants for the label in both locale files
  - [ ] Consider: `languageLabelEn: 'EN'`, `languageLabelRu: 'RU'` — then use conditionally

- [ ] Task 5: Verification
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

## Dev Notes

### CRITICAL: Two Systems Must Stay in Sync

There are TWO independent language systems that must be toggled together:

1. **`uiStore.language`** + `storageService.setLanguage()` — persists to `ios_language` key
2. **`i18next.changeLanguage()`** — triggers translation reload + `languageChanged` event

**Both must be called on every toggle.** If you only call one, the state gets out of sync on next reload.

```typescript
// Correct toggle handler
const handleLanguageToggle = () => {
    const next = language === 'ru' ? 'en' : 'ru';
    setLanguage(next);           // uiStore → storageService.setLanguage()
    i18next.changeLanguage(next); // i18next reload + document.lang via existing handler
};
```

Import `i18next` directly: `import i18next from 'i18next'` — already installed, no new package.

### Existing i18n Setup — DO NOT Reinvent

`src/lib/i18n/index.ts` is fully configured:
- HTTP Backend loading from `public/locales/{lng}/{ns}.json`
- `languageChanged` event handler already sets `document.documentElement.lang`
- Detection: `localStorage['i18nextLng']` → browser → fallback `'en'`

**Note conflict:** `storageService` uses key `ios_language`, but i18next's LanguageDetector uses `i18nextLng`. These are **two separate keys**. On app init, `uiStore.language` reads from `ios_language` via `storageService.getLanguage()`. i18next reads from `i18nextLng`. They can drift.

**Resolution approach:** On `handleLanguageToggle`, call `i18next.changeLanguage(next)` — this writes `i18nextLng` automatically via LanguageDetector. The `uiStore.setLanguage(next)` writes `ios_language`. Both keys stay in sync after a manual toggle.

For initial load, `uiStore.language` is initialized from `storageService.getLanguage()` (reads `ios_language`). The displayed language in UI comes from `i18next.language` (reads `i18nextLng`). On first load with no localStorage — both default correctly if `fallbackLng` is `'ru'`.

### Default Language = Russian

AC #1 says Russian is the default. Check `src/lib/i18n/index.ts`:

```typescript
fallbackLng: DEFAULT_LANGUAGE, // DEFAULT_LANGUAGE is 'en' in constants.ts
```

**Fix required:** Change `DEFAULT_LANGUAGE` in `src/lib/i18n/constants.ts` to `'ru'` OR set `fallbackLng: 'ru'` directly in the init config. Verify `storageService.getLanguage()` already defaults to `'ru'` (it does — line 77 of LocalStorageService.ts).

### AppHeader Integration — Exact Pattern

```typescript
// AppHeader.tsx additions
import i18next from 'i18next';
import { useUiStore } from '@/store/ui/uiStore';

const language = useUiStore.use.language();
const setLanguage = useUiStore.use.setLanguage();

const handleLanguageToggle = () => {
    const next = language === 'ru' ? 'en' : 'ru';
    setLanguage(next);
    void i18next.changeLanguage(next);
};
// ...
<button
  type="button"
  aria-label={t('header.toggleLanguage')}
  onClick={handleLanguageToggle}
  className="rounded px-2 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-alt"
>
  {language === 'ru' ? 'EN' : 'RU'}
</button>
```

**Label convention:** Show the language you will SWITCH TO (e.g., currently Russian → show "EN"). This is consistent with the existing `languageLabel: 'EN'` in common.json.

### Code Snippets Always English (FR51)

Code snippets in question cards are rendered via Shiki (`src/lib/shiki.ts`). They display raw code strings from JSON files which are always in English. This is enforced by data, not by i18n — **no code change needed** for FR51. Verify by inspecting a question with a code block in both RU and EN modes.

### No Tests Required for This Story

Toggle logic is < 10 lines. No extraction to hook needed. If `useAppHeader` is used, keep it thin.

### Architecture Compliance Checklist

- `useUiStore.use.language()` selector pattern
- `import i18next from 'i18next'` — direct import, no wrapper
- `void i18next.changeLanguage(next)` — void the Promise (don't let it float)
- No logic > 10 lines in JSX — extract to inline handler or `useAppHeader` if needed
- `@/` alias only

### References

- `src/store/ui/uiStore.ts` — `language`, `setLanguage` (already in store)
- `src/lib/i18n/index.ts` — `i18next` instance + `languageChanged` handler
- `src/lib/i18n/constants.ts` — `DEFAULT_LANGUAGE`, `SUPPORTED_LANGUAGES`, `I18N_STORAGE_KEY`
- `src/lib/storage/LocalStorageService.ts` — `getLanguage/setLanguage` (key: `ios_language`)
- `src/components/layout/AppHeader/AppHeader.tsx` — language button (currently unwired)
- `public/locales/en/common.json` — `header.toggleLanguage`, `header.languageLabel`
- Story 6.1 (`6-1-dark-light-theme-toggle.md`) — same pattern for theme toggle in AppHeader
