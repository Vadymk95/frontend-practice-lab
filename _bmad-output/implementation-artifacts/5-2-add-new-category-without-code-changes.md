# Story 5.2: Add New Category Without Code Changes

Status: review

## Story

As an **admin**,
I want to add a new question category by dropping a JSON file,
so that the app supports new topics without any application code changes.

## Acceptance Criteria

1. **Given** a new `public/data/<category-slug>.json` file is created following the schema
   **When** `npm run validate:data` runs
   **Then** the new file is discovered and validated automatically (no hardcoded file list)

2. **Given** the new JSON file passes validation and `npm run build` runs (which includes `build:manifest`)
   **When** the SessionConfigurator loads
   **Then** the new category appears in the category grid automatically — sourced from the regenerated `manifest.json`
   **And** questions from the new category are available for selection
   **And** no application source code was modified

3. **Given** the new category file is malformed
   **When** `npm run validate:data` runs
   **Then** it exits with code 1 and reports which file and field failed
   **And** the CI pipeline blocks deployment

## Tasks / Subtasks

- [x] Task 1: Verify auto-discovery in `validate-data.ts` (AC: #1, #3)
  - [x] Confirm `src/scripts/validate-data.ts` uses `fs.readdirSync` — no hardcoded file list
  - [x] Run `npm run validate:data` — confirm it exits 0 and lists all current category files
  - [x] Create a temp malformed JSON file (e.g. `public/data/test-invalid.json` with `{}`), run validate — confirm exit 1 and error message, then delete the temp file

- [x] Task 2: Verify auto-discovery in `generate-manifest.ts` (AC: #2)
  - [x] Confirm `src/scripts/generate-manifest.ts` uses `fs.readdirSync` — no hardcoded file list
  - [x] Run `npm run build:manifest` — confirm `public/data/manifest.json` is regenerated with all current categories

- [x] Task 3: Add an integration test for `validate-data.ts` script (AC: #1, #3)
  - [x] Create `src/scripts/validate-data.test.ts`
  - [x] Test: valid category file passes (exit 0, console log shows `✓`)
  - [x] Test: malformed category file fails (exit 1, console error shows `✗`)
  - [x] Use `vi.spyOn(process, 'exit')` and temp files via `node:fs` in a temp dir
  - [x] Co-locate test alongside script: `src/scripts/validate-data.test.ts`

- [x] Task 4: Add an integration test for `generate-manifest.ts` script (AC: #2)
  - [x] Create `src/scripts/generate-manifest.test.ts`
  - [x] Test: given N valid JSON files in data dir, manifest.json contains N entries with correct slugs/counts
  - [x] Test: given 0 files, exits with code 1
  - [x] Test: given a malformed file, exits with code 1

- [x] Task 5: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### What's Already Implemented (DO NOT Re-implement)

Both scripts already auto-discover files via `fs.readdirSync` — there is no hardcoded file list anywhere. The full pipeline for adding a new category is:

1. Drop `public/data/<slug>.json` (valid schema)
2. `npm run validate:data` → discovers and validates it automatically
3. `npm run build` (or `build:manifest`) → manifest regenerated with new entry
4. App loads manifest via `useCategories()` → new category auto-appears in `SessionConfigurator`

**No application source code changes are needed.** This is already working. This story's only implementation work is writing verification tests.

### Script Architecture (READ BEFORE WRITING TESTS)

**`src/scripts/validate-data.ts`** — Node.js ESM script, uses `process.exit(1)` on failure. Reads from `public/data/` resolved relative to the script location via `path.resolve(__dirname, '../../')`. Exports nothing — it's an executable. To test it, either:
- Import and call `main()` function (requires refactoring to export it) — preferred
- Spawn it as a child process — acceptable fallback

**`src/scripts/generate-manifest.ts`** — same pattern. Reads `public/data/`, writes `public/data/manifest.json`.

**Recommended test approach:** Refactor both scripts to export a `main(dataDir: string)` function that accepts the data directory as a parameter. This enables tests to pass a temp dir without touching the real `public/data/`. Keep the top-level `main()` call using the real path.

```typescript
// validate-data.ts refactor pattern
export function main(dataDir: string = DATA_DIR): void {
    // existing logic, uses dataDir param instead of DATA_DIR constant
}

// Only call when run directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
```

### TDD Protocol for Script Tests

Scripts in `src/scripts/` are pure computation + Node.js fs. Apply TDD:
- Test file alongside script: `src/scripts/validate-data.test.ts`
- Use `vi.mock('node:fs', ...)` OR write to actual temp dir via `os.tmpdir()`
- Check `process.exit` calls via `vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })`

### How `useCategories` Reads the Manifest

`src/hooks/data/useCategories.ts` fetches `/data/manifest.json` via TanStack Query (`staleTime: Infinity`). The `SessionConfigurator` renders categories from this data. Since it's a runtime fetch, any regenerated manifest is picked up on next page load — no code change required.

### Vitest Config Note

Vitest runs in jsdom by default. Scripts that use `node:fs` need `environment: 'node'` per-file:
```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest';
```

### References

- `src/scripts/validate-data.ts` — validation script (read full source before writing tests)
- `src/scripts/generate-manifest.ts` — manifest generator (read full source before writing tests)
- `src/hooks/data/useCategories.ts` — reads manifest.json at `/data/manifest.json`
- `src/lib/data/schema.ts` — Zod schemas used by both scripts

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Refactored `validate-data.ts` and `generate-manifest.ts` to export `main(dataDir, manifestPath?)` accepting injectable paths, enabling testability without touching `public/data/`.
- Scripts retain backward-compatible top-level `main()` call via `import.meta.url === file://...` guard.
- 4 tests for `validate-data`: valid file, empty dir, malformed file, manifest.json exclusion.
- 5 tests for `generate-manifest`: N entries with correct slugs/counts, empty dir, malformed file, manifest exclusion, displayName from slug.
- All 259 tests pass. Format, lint, tsc all clean.

### File List

- `src/scripts/validate-data.ts` — refactored to export `main(dataDir)`
- `src/scripts/validate-data.test.ts` — new: 4 integration tests
- `src/scripts/generate-manifest.ts` — refactored to export `main(dataDir, manifestPath)`
- `src/scripts/generate-manifest.test.ts` — new: 5 integration tests
