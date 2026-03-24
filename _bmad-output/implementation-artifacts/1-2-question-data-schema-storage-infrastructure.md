# Story 1.2: Question Data Schema & Storage Infrastructure

Status: review

## Story

As a **developer**,
I want the question data schema and storage layer implemented,
So that all other features can load typed question data and persist user progress safely.

## Acceptance Criteria

1. **Given** `src/lib/data/schema.ts` exists
   **When** a developer imports question types
   **Then** all 4 zod schemas are available (`SingleChoiceQuestion`, `MultiChoiceQuestion`, `BugFindingQuestion`, `CodeCompletionQuestion`) with correct TypeScript types inferred
   **And** `src/lib/data/categories.ts` is REMOVED — category list is dynamic, sourced from `public/data/manifest.json`

2. **Given** `src/scripts/generate-manifest.ts` exists
   **When** `npm run build:manifest` runs
   **Then** it scans all `public/data/*.json` files and outputs `public/data/manifest.json` with `slug`, `displayName`, and question counts per difficulty per category
   **And** `build:manifest` is called before `vite build` in CI (`deploy.yml`) and locally via `npm run build`

3. **Given** `public/data/manifest.json` exists
   **When** `useCategories()` is called on the home screen
   **Then** it fetches only the manifest (~1KB) via TanStack Query — not full category JSON files
   **And** SessionConfigurator renders all available categories from the manifest with zero hardcoded list

4. **Given** `src/lib/algorithm/index.ts` and `src/lib/algorithm/config.ts` are created
   **When** the algorithm module is imported
   **Then** `ALGORITHM_CONFIG` exports all constants (thresholds, multipliers, weight bounds)
   **And** `sampleWeighted(questions, weights, count)` is implemented — works with default weights of 1.0
   **And** minimum weight `MIN_WEIGHT` ensures every question remains eligible (FR35 — never exclude a question)
   **And** basic unit tests for `sampleWeighted()` pass: correct count, handles `count > pool`, uniform-ish distribution at equal weights, no question excluded at min weight

5. **Given** ≥2 sample JSON files exist in `public/data/` with ≥5 questions each
   **When** `npm run validate:data` executes
   **Then** exits code 0 for valid files, code 1 for any schema violation

6. **Given** `src/lib/storage/types.ts` defines the `StorageService` interface
   **When** `LocalStorageService` is used
   **Then** all methods (getWeights, setWeights, getErrorRates, setErrorRates, getStreak, setStreak, getRecords, setRecord, getTheme, setTheme, getLanguage, setLanguage, getPresets, savePreset, deletePreset) read/write to localStorage with consistent keys
   **And** `LocalStorageService` is exported as a singleton from `src/lib/storage/index.ts`

7. **Given** all three Zustand stores are scaffolded
   **When** the app initializes
   **Then** `sessionStore` (`src/store/session/`) is created — NOT persisted, holds active session state
   **And** `progressStore` (`src/store/progress/`) is created — persisted via `StorageService`, holds weights + error rates + streak + records
   **And** `uiStore` (`src/store/ui/`) is created — persisted via `StorageService`, holds theme + language
   **And** all three stores use `createSelectors` from `src/store/utils/createSelectors.ts`

8. **Given** `uiStore` is initialized
   **When** the app loads for the first time (no localStorage data)
   **Then** theme defaults to `'dark'` and language defaults to `'ru'`
   **And** the `.dark` CSS class is applied to `document.documentElement` on init and on every theme change
   **And** both theme and language are persisted to localStorage on change

## Tasks / Subtasks

- [x] Task 1: Create question data schemas (`src/lib/data/`)
  - [x] Create `src/lib/data/schema.ts` with 4 zod schemas + `Question` union type
  - [x] Create `src/lib/data/types.ts` re-exporting inferred TypeScript types
  - [x] Delete `src/lib/data/categories.ts` if it exists (replaced by dynamic manifest)

- [x] Task 2: Manifest generator + sample data (`src/scripts/`, `public/data/`)
  - [x] Create `src/scripts/generate-manifest.ts` — scans `public/data/*.json`, outputs `public/data/manifest.json`
  - [x] Add `tsx` to devDependencies (`npm install -D tsx`)
  - [x] Add `"build:manifest": "tsx src/scripts/generate-manifest.ts"` to `package.json` scripts
  - [x] Modify `"build"` script: `"npm run build:manifest && tsc -b && vite build"`
  - [x] Create ≥2 sample JSON files in `public/data/` (e.g. `javascript.json`, `typescript.json`) with ≥5 questions each, covering all 4 question types
  - [x] Run `npm run build:manifest` to generate `public/data/manifest.json`

- [x] Task 3: Data validation script
  - [x] Create `src/scripts/validate-data.ts` — imports zod schemas, parses all `public/data/*.json`, exits code 1 on violation
  - [x] Add `"validate:data": "tsx src/scripts/validate-data.ts"` to `package.json` scripts
  - [x] Verify `npm run validate:data` exits 0 with valid data

- [x] Task 4: StorageService interface + LocalStorageService
  - [x] Create `src/lib/storage/types.ts` with `StorageService` interface + `StreakData` + `SessionPreset` types
  - [x] Create `src/lib/storage/LocalStorageService.ts` implementing the interface
  - [x] Create `src/lib/storage/index.ts` exporting `storageService` singleton

- [x] Task 5: Algorithm module
  - [x] Create `src/lib/algorithm/config.ts` with `ALGORITHM_CONFIG` object
  - [x] Create `src/lib/algorithm/index.ts` with `sampleWeighted()` (+ stubs for `calculateWeight`, `updateErrorRate` — full impl in Story 4.x)
  - [x] Create `src/lib/algorithm/algorithm.test.ts` with unit tests for `sampleWeighted()`

- [x] Task 6: Three Zustand stores
  - [x] Create `src/store/session/sessionStore.ts` — not persisted
  - [x] Create `src/store/session/index.ts`
  - [x] Create `src/store/progress/progressStore.ts` — reads/writes via `storageService`
  - [x] Create `src/store/progress/index.ts`
  - [x] Create `src/store/ui/uiStore.ts` — reads/writes via `storageService`; applies `.dark` class on init + on change
  - [x] Create `src/store/ui/index.ts`

- [x] Task 7: Shared hooks scaffold
  - [x] Create `src/hooks/data/useCategories.ts` — fetches `public/data/manifest.json` via TanStack Query
  - [x] Create `src/hooks/ui/useTheme.ts` — reads/sets theme via `uiStore`
  - [x] Create `src/hooks/ui/useLanguage.ts` — reads/sets language via `uiStore` + calls `i18n.changeLanguage()`

- [x] Task 8: Wire uiStore initialization in App.tsx
  - [x] Remove hardcoded `class="dark"` from `index.html` (was temporary in Story 1.1)
  - [x] In `App.tsx`, call `useTheme()` to trigger uiStore hydration from localStorage + apply `.dark` class on mount

## Dev Notes

### Critical: What Story 1.1 Left as Temporary

Story 1.1 hardcoded `class="dark"` in `index.html` with this note: _"uiStore (Story 1.2) will take over persistence"_.

**Action required:** Remove `class="dark"` from `index.html`. The `uiStore` initialization in Story 1.2 applies the `.dark` class dynamically via `document.documentElement.classList`.

The AppHeader language + theme toggle buttons remain **non-functional placeholders** (wired up in Epic 6). But `uiStore` must correctly manage state — the `useTheme` and `useLanguage` hooks scaffold the connection for future use.

### Zustand Store Pattern (follow exactly — same as existing userStore)

```typescript
// Pattern: create + devtools + createSelectors
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createSelectors } from '@/store/utils/createSelectors';

const useUiStoreBase = create<UiState>()(
    devtools(
        (set, get) => ({
            // state + actions
        }),
        { name: 'ui-store' }  // appears in Redux DevTools
    )
);

export const useUiStore = createSelectors(useUiStoreBase);
```

**No `persist` middleware** — stores read from `storageService` on init and write via `storageService` in actions. This keeps the storage layer swappable (localStorage → Firebase v2 = zero UI changes).

### Zustand Store Domains — Strict Boundaries

| Store | Path | Persisted | State Slice |
|-------|------|-----------|-------------|
| `sessionStore` | `src/store/session/` | ❌ | `questionList`, `currentIndex`, `answers`, `skipList`, `config`, `timerMs` |
| `progressStore` | `src/store/progress/` | ✅ via `storageService` | `weights`, `errorRates`, `streak`, `records` |
| `uiStore` | `src/store/ui/` | ✅ via `storageService` | `theme: 'dark' \| 'light'`, `language: 'ru' \| 'en'` |

**Rule:** Stores never call each other. No cross-store imports.

### uiStore Theme Initialization Pattern

```typescript
// In uiStore actions:
setTheme: (theme: 'dark' | 'light') => {
    set({ theme }, false, { type: 'ui-store/setTheme' });
    document.documentElement.classList.toggle('dark', theme === 'dark');
    storageService.setTheme(theme);
},
// Init on store creation — call this once:
initTheme: () => {
    const theme = storageService.getTheme(); // defaults to 'dark'
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme }, false, { type: 'ui-store/initTheme' });
},
```

Call `useUiStore.use.initTheme()()` inside `useTheme()` hook on mount (via `useEffect`).

### Zod Schema Structure (`src/lib/data/schema.ts`)

```typescript
import { z } from 'zod';

const BaseQuestionSchema = z.object({
    id: z.string(),               // stable slug e.g. "js-closure-001"
    type: z.enum(['single-choice', 'multi-choice', 'bug-finding', 'code-completion']),
    category: z.string(),         // matches JSON filename without .json
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()),
    question: z.string(),
    explanation: z.string(),
});

const SingleChoiceSchema = BaseQuestionSchema.extend({
    type: z.literal('single-choice'),
    options: z.array(z.string()),
    correct: z.number().int().nonnegative(),
});

const MultiChoiceSchema = BaseQuestionSchema.extend({
    type: z.literal('multi-choice'),
    options: z.array(z.string()),
    correct: z.array(z.number().int().nonnegative()),
});

const BugFindingSchema = BaseQuestionSchema.extend({
    type: z.literal('bug-finding'),
    code: z.string(),
    options: z.array(z.string()).optional(),
    correct: z.string(),
    referenceAnswer: z.string(),
});

const CodeCompletionSchema = BaseQuestionSchema.extend({
    type: z.literal('code-completion'),
    code: z.string(),             // contains __BLANK__ markers
    blanks: z.array(z.string()), // correct values (case-insensitive, trimmed validation)
    referenceAnswer: z.string(),
});

export const QuestionSchema = z.discriminatedUnion('type', [
    SingleChoiceSchema,
    MultiChoiceSchema,
    BugFindingSchema,
    CodeCompletionSchema,
]);

export const CategoryFileSchema = z.array(QuestionSchema);

// Inferred TypeScript types
export type SingleChoiceQuestion = z.infer<typeof SingleChoiceSchema>;
export type MultiChoiceQuestion = z.infer<typeof MultiChoiceSchema>;
export type BugFindingQuestion = z.infer<typeof BugFindingSchema>;
export type CodeCompletionQuestion = z.infer<typeof CodeCompletionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
```

### StorageService Interface (`src/lib/storage/types.ts`)

```typescript
export interface StreakData {
    current: number;         // days in a row
    lastActivityDate: string; // ISO date string e.g. "2026-03-24"
}

export interface SessionPreset {
    id: string;
    name: string;
    config: SessionConfig;   // defined when sessionStore is fully typed
    createdAt: string;
    lastUsedAt: string;
}

export interface StorageService {
    // Progress
    getWeights(): Record<string, number>;
    setWeights(weights: Record<string, number>): void;
    getErrorRates(): Record<string, number>;
    setErrorRates(rates: Record<string, number>): void;
    getStreak(): StreakData;
    setStreak(data: StreakData): void;
    getRecords(): Record<string, number>;
    setRecord(key: string, ms: number): void;
    // UI
    getTheme(): 'dark' | 'light';
    setTheme(t: 'dark' | 'light'): void;
    getLanguage(): 'ru' | 'en';
    setLanguage(l: 'ru' | 'en'): void;
    // Presets
    getPresets(): SessionPreset[];
    savePreset(p: SessionPreset): void;
    deletePreset(id: string): void;
}
```

### LocalStorageService — Key Constants

Use string constants (no magic strings):

```typescript
const STORAGE_KEYS = {
    WEIGHTS: 'ios_weights',
    ERROR_RATES: 'ios_error_rates',
    STREAK: 'ios_streak',
    RECORDS: 'ios_records',
    THEME: 'ios_theme',
    LANGUAGE: 'ios_language',
    PRESETS: 'ios_presets',
} as const;
```

Default values on `getX()` if key is absent:
- `getTheme()` → `'dark'`
- `getLanguage()` → `'ru'`
- `getWeights()` / `getErrorRates()` / `getRecords()` → `{}`
- `getStreak()` → `{ current: 0, lastActivityDate: '' }`
- `getPresets()` → `[]`

Wrap all `localStorage.getItem` calls with `try/catch` — storage may be unavailable (private browsing).

### Algorithm Config (`src/lib/algorithm/config.ts`)

```typescript
export const ALGORITHM_CONFIG = {
    HIGH_ERROR_THRESHOLD: 0.40,
    LOW_ERROR_THRESHOLD: 0.15,
    HIGH_ERROR_MULTIPLIER: 2.0,
    LOW_ERROR_MULTIPLIER: 0.5,
    MAX_WEIGHT: 10,
    MIN_WEIGHT: 0.5,      // ensures NO question is ever excluded from pool
    DEFAULT_WEIGHT: 1.0,
} as const;
```

### sampleWeighted() Implementation Notes

```typescript
// src/lib/algorithm/index.ts
export function sampleWeighted(
    questions: Question[],
    weights: Record<string, number>,
    count: number
): Question[] {
    // Use DEFAULT_WEIGHT for any question without a stored weight
    // count > pool → return full shuffled pool (never error)
    // Implementation: weighted reservoir sampling or cumulative-probability approach
    // Must never return fewer than min(count, questions.length) results
}

// Stub exports for Story 4.x (full adaptive logic):
export function calculateWeight(errorRate: number, currentWeight: number): number {
    // Full impl deferred to Story 4.x
    return currentWeight;
}
export function updateErrorRate(previous: number, correct: boolean): number {
    // Full impl deferred to Story 4.x
    return previous;
}
```

**Unit tests must cover:**
- Returns exactly `count` items when pool is large enough
- Returns all items (shuffled) when `count >= pool.length`
- No question excluded when all have `MIN_WEIGHT`
- Equal weights produce uniform-ish distribution (statistical test with large N)

### Manifest Generator (`src/scripts/generate-manifest.ts`)

```typescript
// Output: public/data/manifest.json
// Shape:
interface ManifestEntry {
    slug: string;          // filename without .json, e.g. "javascript"
    displayName: string;   // human-readable, e.g. "JavaScript"
    counts: {
        easy: number;
        medium: number;
        hard: number;
        total: number;
    };
}
type Manifest = ManifestEntry[];
```

Display name derivation: convert slug to title case, replace hyphens with spaces (e.g. `"api-backend-for-frontend"` → `"Api Backend For Frontend"`). **Do not hardcode display names.**

The generator should:
1. `glob('public/data/*.json')` (use Node.js `fs.readdirSync`)
2. Parse each file with `CategoryFileSchema.parse()`
3. Count difficulties
4. Write `public/data/manifest.json`
5. Exit 0 on success, log error + exit 1 on schema violation

### validate-data.ts Script

Same logic as manifest generator but:
- Does NOT write any file
- Logs each invalid file with specific zod error messages
- Exits code 1 if ANY file fails validation
- Exits code 0 if ALL files pass

### useCategories Hook (TanStack Query)

```typescript
// src/hooks/data/useCategories.ts
import { useQuery } from '@tanstack/react-query';

const MANIFEST_URL = '/data/manifest.json';

export function useCategories() {
    return useQuery({
        queryKey: ['categories', 'manifest'],
        queryFn: async () => {
            const res = await fetch(MANIFEST_URL);
            if (!res.ok) throw new Error('Failed to load categories');
            return res.json() as Promise<ManifestEntry[]>;
        },
        staleTime: Infinity, // manifest doesn't change at runtime
    });
}
```

### Sample JSON Data Format

Minimum 2 files: `public/data/javascript.json` and `public/data/typescript.json`. Each must include all 4 question types to enable testing of the full rendering pipeline in later stories.

```json
[
  {
    "id": "js-closure-001",
    "type": "single-choice",
    "category": "javascript",
    "difficulty": "easy",
    "tags": ["closures", "scope"],
    "question": "What is a closure in JavaScript?",
    "options": ["...", "...", "...", "..."],
    "correct": 0,
    "explanation": "..."
  }
]
```

### package.json Script Changes

```json
{
  "scripts": {
    "build": "npm run build:manifest && tsc -b && vite build",
    "build:manifest": "tsx src/scripts/generate-manifest.ts",
    "validate:data": "tsx src/scripts/validate-data.ts"
  }
}
```

Add `tsx` to devDependencies: `npm install -D tsx`

### File Structure for This Story

```
src/
  lib/
    algorithm/
      config.ts              ← NEW
      index.ts               ← NEW
      algorithm.test.ts      ← NEW
    data/
      schema.ts              ← NEW (zod + TypeScript types)
      types.ts               ← NEW (re-exports)
      categories.ts          ← DELETE if exists
    storage/
      types.ts               ← NEW (StorageService interface + StreakData + SessionPreset)
      LocalStorageService.ts ← NEW
      index.ts               ← NEW (singleton: storageService)
  store/
    session/
      sessionStore.ts        ← NEW
      index.ts               ← NEW
    progress/
      progressStore.ts       ← NEW
      index.ts               ← NEW
    ui/
      uiStore.ts             ← NEW
      index.ts               ← NEW
  hooks/
    data/
      useCategories.ts       ← NEW
    ui/
      useTheme.ts            ← NEW
      useLanguage.ts         ← NEW
  scripts/
    generate-manifest.ts     ← NEW
    validate-data.ts         ← NEW
public/
  data/
    javascript.json          ← NEW (≥5 questions, all 4 types)
    typescript.json          ← NEW (≥5 questions, all 4 types)
    manifest.json            ← GENERATED by build:manifest
index.html                   ← MODIFY: remove class="dark" (uiStore takes over)
src/App.tsx                  ← MODIFY: call useTheme() to trigger uiStore init
```

### Files to NOT Touch

| File | Reason |
|------|--------|
| `src/store/utils/createSelectors.ts` | Already correct, do not modify |
| `src/store/user/userStore.ts` | Legacy placeholder, leave as-is |
| `src/lib/queryClient.ts` | Already configured |
| `src/lib/i18n/` | Already configured |
| `src/components/layout/AppHeader/` | Toggle buttons remain non-functional placeholders (Epic 6) |
| `src/router/` | No routing changes in this story |

### Existing Libraries Available (no new installs needed except tsx)

- `zod` ✅ — schema validation
- `zustand` ✅ — stores
- `@tanstack/react-query` ✅ — data fetching (useCategories)
- `i18next` + `react-i18next` ✅ — for `useLanguage.ts` (`import { i18n } from '@/lib/i18n'`)
- `tsx` ❌ — **must add**: `npm install -D tsx`

### Import Alias Rules

- Always `@/` — never `../../`
- `@/lib/storage` → `src/lib/storage/index.ts`
- `@/store/ui` → `src/store/ui/index.ts`
- `@/lib/algorithm` → `src/lib/algorithm/index.ts`

### Post-Edit Verification Commands

```bash
npm run build:manifest   # must succeed (generates manifest.json)
npm run validate:data    # must exit 0
npm run lint
npm run format:check
npx tsc --noEmit
npm run test             # algorithm.test.ts must pass
```

All 5 must pass before marking complete.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Task 1: Created `schema.ts` with 4 zod discriminated-union schemas (SingleChoice, MultiChoice, BugFinding, CodeCompletion) + CategoryFileSchema. `types.ts` re-exports inferred types. No `categories.ts` existed to delete.
- Task 2: Created `generate-manifest.ts` using Node.js fs + zod validation. Added `tsx` (was already in devDeps), `build:manifest` + updated `build` script. Created `javascript.json` and `typescript.json` with 6 questions each covering all 4 types. `manifest.json` generated successfully.
- Task 3: Created `validate-data.ts` — exits 0 for valid data, 1 for schema violations. `npm run validate:data` exits 0.
- Task 4: Created `LocalStorageService` with `try/catch` wrapped JSON reads/writes, STORAGE_KEYS constants, correct defaults. Exported as `storageService` singleton.
- Task 5: Tests written first (RED), then implementation (GREEN). `sampleWeighted()` uses weighted random sampling without replacement. All 8 algorithm tests pass. Stubs use `_` prefix for unused params; added `argsIgnorePattern: '^_'` to ESLint config.
- Task 6: Three stores created: `sessionStore` (not persisted, 7 actions), `progressStore` (reads/writes via storageService), `uiStore` (theme+language with initTheme action that applies .dark class).
- Task 7: `useCategories` fetches manifest via TanStack Query with `staleTime: Infinity`. `useTheme` calls `initTheme` on mount via useEffect. `useLanguage` calls both uiStore.setLanguage + i18next.changeLanguage.
- Task 8: Removed `class="dark"` from `index.html`. Added `useTheme()` call in `App.tsx` to hydrate uiStore on mount.
- All checks pass: build:manifest ✓, validate:data ✓, lint ✓, format:check ✓, tsc --noEmit ✓, test (29/29) ✓

### File List

- `src/lib/data/schema.ts` — NEW: 4 zod schemas + Question union type + CategoryFileSchema
- `src/lib/data/types.ts` — NEW: re-exports of inferred TypeScript types
- `src/lib/storage/types.ts` — NEW: StorageService interface + StreakData + SessionPreset + SessionConfig
- `src/lib/storage/LocalStorageService.ts` — NEW: localStorage implementation
- `src/lib/storage/index.ts` — NEW: storageService singleton export
- `src/lib/algorithm/config.ts` — NEW: ALGORITHM_CONFIG constants
- `src/lib/algorithm/index.ts` — NEW: sampleWeighted() + stubs
- `src/lib/algorithm/algorithm.test.ts` — NEW: 8 unit tests for sampleWeighted
- `src/store/session/sessionStore.ts` — NEW: session store (not persisted)
- `src/store/session/index.ts` — NEW: re-export
- `src/store/progress/progressStore.ts` — NEW: progress store (persisted via storageService)
- `src/store/progress/index.ts` — NEW: re-export
- `src/store/ui/uiStore.ts` — NEW: ui store (theme + language, persisted)
- `src/store/ui/index.ts` — NEW: re-export
- `src/hooks/data/useCategories.ts` — NEW: TanStack Query hook for manifest
- `src/hooks/ui/useTheme.ts` — NEW: theme hook with initTheme on mount
- `src/hooks/ui/useLanguage.ts` — NEW: language hook syncing uiStore + i18next
- `src/scripts/generate-manifest.ts` — NEW: manifest generator script
- `src/scripts/validate-data.ts` — NEW: data validation script
- `public/data/javascript.json` — NEW: 6 sample questions (all 4 types)
- `public/data/typescript.json` — NEW: 6 sample questions (all 4 types)
- `public/data/manifest.json` — GENERATED: 2 categories manifest
- `index.html` — MODIFIED: removed temporary class="dark"
- `src/App.tsx` — MODIFIED: added useTheme() import and call
- `package.json` — MODIFIED: added build:manifest, validate:data scripts; updated build script
- `eslint.config.js` — MODIFIED: added argsIgnorePattern/varsIgnorePattern for _ prefix convention

### Change Log

- 2026-03-24: Story 1.2 implemented — zod schemas, manifest pipeline, StorageService, algorithm module, 3 Zustand stores, shared hooks, uiStore wired to App.tsx
