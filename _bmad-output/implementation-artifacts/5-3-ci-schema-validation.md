# Story 5.3: CI Schema Validation

Status: review

## Story

As an **admin**,
I want JSON content validated automatically on every push,
so that malformed questions never reach production.

## Acceptance Criteria

1. **Given** `src/scripts/validate-data.ts` exists
   **When** `npm run validate:data` runs
   **Then** it discovers all `public/data/*.json` files dynamically
   **And** validates each against the zod schemas from `src/lib/data/schema.ts`
   **And** exits with code 0 if all files are valid
   **And** exits with code 1 and prints the file path + field + error message for any violation

2. **Given** a push is made to any branch
   **When** the `ci.yml` GitHub Actions workflow runs
   **Then** `validate:data` runs as part of the pipeline (after `tsc --noEmit`, before `test`)
   **And** a schema violation causes the entire pipeline to fail and blocks merging

## Tasks / Subtasks

- [x] Task 1: Audit `src/scripts/validate-data.ts` against AC #1 (AC: #1)
  - [x] Confirm dynamic discovery: `fs.readdirSync` with no hardcoded file list ← already in place
  - [x] Confirm Zod validation via `CategoryFileSchema.parse()` ← already in place
  - [x] Confirm exit code 0 on success, exit code 1 + error message on failure ← already in place
  - [x] If error output format is unclear (missing file path or field name), improve the `catch` block

- [x] Task 2: Audit `.github/workflows/ci.yml` against AC #2 (AC: #2)
  - [x] Confirm `validate:data` step exists in the workflow ← already in place
  - [x] Confirm ordering: after `tsc --noEmit`, before `Run Tests` ← already in place
  - [x] Confirm it runs on both `push` and `pull_request` ← already in place
  - [x] If any gap is found, fix `ci.yml` accordingly

- [x] Task 3: Improve error output if needed (AC: #1)
  - [x] Current `catch` prints `err` which may be verbose Zod output
  - [x] If Zod error format is unreadable, extract `err instanceof ZodError ? err.errors : err` for clean output
  - [x] Output format should clearly show: file path, field path, message

- [x] Task 4: Verification
  - [x] `npm run validate:data` exits 0 with current data files
  - [x] Temporarily create `public/data/bad-test.json` with `[{"id": "x"}]`, run validate → confirm exit 1 + clear error, then delete
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### Current Implementation Status — MOSTLY DONE

**This story's infrastructure is 100% already implemented.** Before writing any new code, read the existing files:

- `src/scripts/validate-data.ts` — reads `public/data/`, validates with `CategoryFileSchema.parse()`, exits 1 on error ✓
- `package.json` — `"validate:data": "tsx src/scripts/validate-data.ts"` ✓
- `.github/workflows/ci.yml` — step "Validate Data" with `npm run validate:data` runs after "Type Check", before "Run Tests" ✓

**The only real work is:** auditing the error output format (Task 3) and writing the verification test (implicit in AC #1). If the error output already clearly shows file + field + message, this story is essentially verification-only.

### Current CI Pipeline Order (from `.github/workflows/ci.yml`)

```
1. Install dependencies (npm ci)
2. Audit dependencies (npm audit)
3. Run Linter (npm run lint)
4. Check Formatting (npm run format:check)
5. Type Check (npx tsc --noEmit)
6. Validate Data (npm run validate:data)   ← Story 5.3
7. Run Tests (npm run test)
```

The ordering is correct per AC #2 requirements.

### Zod Error Output Improvement Pattern

If the current error output is a raw Zod exception (verbose), improve it:

```typescript
import { ZodError } from 'zod';

// In the catch block:
} catch (err) {
    if (err instanceof ZodError) {
        for (const issue of err.issues) {
            const fieldPath = issue.path.join('.');
            console.error(`  Field: ${fieldPath || '(root)'}`);
            console.error(`  Error: ${issue.message}`);
        }
    } else {
        console.error(`  Error: ${String(err)}`);
    }
    hasError = true;
}
```

### No New Dependencies Required

`tsx` (already in devDependencies) runs the script. `zod` (already a dependency) provides `ZodError`.

### Ghost Principle

Change ONLY what's needed to satisfy the ACs. If `validate-data.ts` already produces clear error output, Task 3 is a no-op. Do not refactor the script beyond what the AC requires.

### References

- `src/scripts/validate-data.ts` — existing validation script (read before editing)
- `.github/workflows/ci.yml` — CI pipeline (read before editing)
- `package.json` → `scripts` section — npm script definitions
- `src/lib/data/schema.ts` — Zod schemas: `CategoryFileSchema`, `QuestionSchema`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Audited validate-data.ts: dynamic discovery, Zod validation, exit codes all in place — no changes needed.
- Audited ci.yml: validate:data step exists in correct position (after tsc, before tests), runs on push and pull_request — no changes needed.
- Task 3 executed: raw ZodError dump replaced with structured per-issue output (`[index].field: message`). Added `import { ZodError } from 'zod'`. Updated validate-data.test.ts assertion to match new single-arg console.error call + field-level error line.
- All 259 tests pass.

### File List

- `src/scripts/validate-data.ts` — improved catch block: ZodError → per-field output format
- `src/scripts/validate-data.test.ts` — updated assertion for new error output format
