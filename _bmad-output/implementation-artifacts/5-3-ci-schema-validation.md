# Story 5.3: CI Schema Validation

Status: ready-for-dev

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

- [ ] Task 1: Audit `src/scripts/validate-data.ts` against AC #1 (AC: #1)
  - [ ] Confirm dynamic discovery: `fs.readdirSync` with no hardcoded file list ← already in place
  - [ ] Confirm Zod validation via `CategoryFileSchema.parse()` ← already in place
  - [ ] Confirm exit code 0 on success, exit code 1 + error message on failure ← already in place
  - [ ] If error output format is unclear (missing file path or field name), improve the `catch` block

- [ ] Task 2: Audit `.github/workflows/ci.yml` against AC #2 (AC: #2)
  - [ ] Confirm `validate:data` step exists in the workflow ← already in place
  - [ ] Confirm ordering: after `tsc --noEmit`, before `Run Tests` ← already in place
  - [ ] Confirm it runs on both `push` and `pull_request` ← already in place
  - [ ] If any gap is found, fix `ci.yml` accordingly

- [ ] Task 3: Improve error output if needed (AC: #1)
  - [ ] Current `catch` prints `err` which may be verbose Zod output
  - [ ] If Zod error format is unreadable, extract `err instanceof ZodError ? err.errors : err` for clean output
  - [ ] Output format should clearly show: file path, field path, message

- [ ] Task 4: Verification
  - [ ] `npm run validate:data` exits 0 with current data files
  - [ ] Temporarily create `public/data/bad-test.json` with `[{"id": "x"}]`, run validate → confirm exit 1 + clear error, then delete
  - [ ] `npm run format`
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run test`

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

### File List
