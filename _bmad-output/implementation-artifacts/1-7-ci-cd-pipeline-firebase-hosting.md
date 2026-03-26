# Story 1.7: CI/CD Pipeline & Firebase Hosting

Status: review

## Story

As a **developer**,
I want CI/CD automation and Firebase Hosting configured,
so that every push is validated and every merge to master auto-deploys the app.

## Acceptance Criteria

1. **Given** a push or PR to any branch
   **When** GitHub Actions `ci.yml` runs
   **Then** the pipeline executes in order: `lint` → `format:check` → `tsc --noEmit` → `validate:data` → `test`
   **And** any step failure blocks the pipeline

2. **Given** a push to `master` branch
   **When** `deploy.yml` runs
   **Then** all CI checks pass first, then `npm run build` runs, then `firebase deploy --only hosting` deploys `dist/`
   **And** `firebase.json` includes SPA rewrites (`"**"` → `/index.html`) and cache headers for `*.js`/`*.css` (1 year = `max-age=31536000`) and `/data/**` (1 day = `max-age=86400`)

3. **Given** the `FIREBASE_TOKEN` secret is set in GitHub repo settings
   **When** the deploy workflow authenticates
   **Then** deployment succeeds without manual intervention
   **And** `.firebaserc` contains `{ "projects": { "default": "<project-id>" } }`

## Tasks / Subtasks

- [x] Task 1: Patch `ci.yml` to add missing steps (AC: #1)
  - [x] Add `npx tsc --noEmit` step AFTER `format:check` and BEFORE `test`
  - [x] Add `npm run validate:data` step AFTER `tsc --noEmit` and BEFORE `test`
  - [x] Remove redundant `Production build` step from ci.yml (build is deploy-only concern)
  - [x] Verify step order: `npm ci` → `npm audit` → `lint` → `format:check` → `tsc --noEmit` → `validate:data` → `test`

- [x] Task 2: Create `firebase.json` (AC: #2)
  - [x] Create at project root with exact config from architecture (see Dev Notes)

- [x] Task 3: Create `.firebaserc` (AC: #3)
  - [x] Create at project root with placeholder project-id

- [x] Task 4: Create `.github/workflows/deploy.yml` (AC: #2, #3)
  - [x] Trigger: push to `master` only (NOT `main` — repo uses `master`)
  - [x] Steps: `npm ci` → `lint` → `format:check` → `tsc --noEmit` → `validate:data` → `test` → `build` → firebase deploy
  - [x] Use `FIREBASE_TOKEN` secret from environment
  - [x] Use `firebase-tools` via `npx` (no devDependency needed)

- [x] Task 5: Verification
  - [x] `npm run format` — no errors
  - [x] `npm run lint` — clean
  - [x] `npx tsc --noEmit` — clean
  - [x] `npm run test` — all tests pass
  - [ ] Manually push a branch → verify ci.yml runs all 5 check steps in CI

---

## Dev Notes

### CRITICAL: Branch Name Is `master`, NOT `main`

The repo default branch is `master`. The existing `ci.yml` correctly uses `master`. The architecture doc erroneously says `main` in one place — **ignore that**. Both `ci.yml` and `deploy.yml` must use `master`.

### CRITICAL: Current `ci.yml` Is Incomplete — Do NOT Replace, Patch It

Current `.github/workflows/ci.yml` step order:
```
npm ci → npm audit → lint → format:check → test → build
```

Required step order (architecture spec):
```
npm ci → npm audit → lint → format:check → tsc --noEmit → validate:data → test
```

Changes:
1. **Add** `npx tsc --noEmit` step between `format:check` and `test`
2. **Add** `npm run validate:data` step between `tsc --noEmit` and `test`
3. **Remove** the `Production build` step from ci.yml — build belongs only in deploy.yml

Do NOT restructure the existing YAML, only add/remove the specific steps.

### Patched `ci.yml` — Final Form

```yaml
name: CI

on:
    pull_request:
        branches: [master]
    push:
        branches: [master]

jobs:
    validate:
        runs-on: ubuntu-latest

        strategy:
            matrix:
                node-version: [24.x]

        steps:
            - uses: actions/checkout@v4

            - name: Use Node.js ${{ matrix.node-version }}
              uses: actions/setup-node@v4
              with:
                  node-version: ${{ matrix.node-version }}
                  cache: 'npm'

            - name: Install dependencies
              run: npm ci

            - name: Audit dependencies
              run: npm audit --audit-level=moderate

            - name: Run Linter
              run: npm run lint

            - name: Check Formatting
              run: npm run format:check

            - name: Type Check
              run: npx tsc --noEmit

            - name: Validate Data
              run: npm run validate:data

            - name: Run Tests
              run: npm run test
```

### `deploy.yml` — Full File

```yaml
name: Deploy

on:
    push:
        branches: [master]

jobs:
    deploy:
        runs-on: ubuntu-latest

        steps:
            - uses: actions/checkout@v4

            - name: Use Node.js 24.x
              uses: actions/setup-node@v4
              with:
                  node-version: 24.x
                  cache: 'npm'

            - name: Install dependencies
              run: npm ci

            - name: Run Linter
              run: npm run lint

            - name: Check Formatting
              run: npm run format:check

            - name: Type Check
              run: npx tsc --noEmit

            - name: Validate Data
              run: npm run validate:data

            - name: Run Tests
              run: npm run test

            - name: Build
              run: npm run build

            - name: Deploy to Firebase Hosting
              run: npx firebase-tools deploy --only hosting --non-interactive --token "${{ secrets.FIREBASE_TOKEN }}"
```

**Why `npx firebase-tools` not `firebase`:** `firebase-tools` is not in devDependencies and does not need to be. `npx` downloads and runs it in CI without polluting the project. The `--non-interactive` flag prevents any prompts that would hang the pipeline.

### `firebase.json` — Exact Config from Architecture

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "**/*.@(js|css)", "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }] },
      { "source": "/data/**", "headers": [{ "key": "Cache-Control", "value": "max-age=86400" }] }
    ]
  }
}
```

**Why these headers:** JS/CSS filenames include content hashes (`main.a1b2c3.js`) → safe for 1-year caching. `/data/**` JSON files may update with new questions → 1-day cache balances freshness vs. performance.

### `.firebaserc` — Placeholder

```json
{
  "projects": {
    "default": "<your-firebase-project-id>"
  }
}
```

**User action required:** Replace `<your-firebase-project-id>` with the actual project ID from `console.firebase.google.com`, then run `firebase use --add` locally.

### `FIREBASE_TOKEN` Secret

User must add this to GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
- Name: `FIREBASE_TOKEN`
- Value: output of `npx firebase-tools login:ci` run locally

This is a one-time manual step. The deploy.yml reads it as `${{ secrets.FIREBASE_TOKEN }}`.

### File Structure — Complete

```
.github/
  workflows/
    ci.yml              ← PATCH (add tsc + validate:data, remove build step)
    deploy.yml          ← NEW
firebase.json           ← NEW (project root)
.firebaserc             ← NEW (project root)
```

No `src/` files are touched in this story. This is pure infrastructure.

### `validate:data` Script Reference

The script already exists: `npm run validate:data` → `tsx src/scripts/validate-data.ts`

It imports zod schemas, parses all `public/data/*.json` files, exits with code 1 on schema violation. It is already working — just not wired into CI.

### `npm run build` Script Reference

`build` = `npm run build:manifest && tsc -b && vite build`

Note: `tsc -b` (project references build) is different from `tsc --noEmit`. CI uses `tsc --noEmit` for fast type checking without emitting files. Deploy uses `npm run build` which runs `tsc -b` as part of the full production build.

### `.firebaserc` and `firebase.json` in `.gitignore`?

**Check:** Verify neither file is in `.gitignore` before committing. Both MUST be committed to the repository for the CI/CD pipeline to work. `.firebaserc` contains no secrets (only project ID). `FIREBASE_TOKEN` is never committed — it lives in GitHub secrets only.

### Node Version Alignment

`.nvmrc` contains `24`. `ci.yml` uses `node-version: [24.x]` via matrix. `deploy.yml` uses `node-version: 24.x` directly (no matrix needed since single environment). `package.json` engines: `node >= 24.0.0`. All aligned.

### Post-Edit Verification Commands

```bash
npm run format
npm run lint
npx tsc --noEmit
npm run test
```

No new source code = no new tests required. Verify YAML syntax is valid (no tab characters in YAML — use spaces only).

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blockers encountered._

### Completion Notes List

- Patched `ci.yml`: added `Type Check` (npx tsc --noEmit) and `Validate Data` (npm run validate:data) steps between `format:check` and `test`; removed `Production build` step.
- Created `firebase.json` at project root with SPA rewrites and cache headers (JS/CSS: 1 year, /data/**: 1 day).
- Created `.firebaserc` at project root with placeholder `<your-firebase-project-id>`.
- Created `.github/workflows/deploy.yml` triggering on push to `master`: runs full validation chain then builds and deploys via `npx firebase-tools`.
- All 90 tests pass, lint clean, tsc clean. No new source files — no new tests required.
- Manual step remaining: user must set `FIREBASE_TOKEN` secret in GitHub repo settings and replace `<your-firebase-project-id>` in `.firebaserc`.

### File List

- `.github/workflows/ci.yml` (modified)
- `.github/workflows/deploy.yml` (new)
- `firebase.json` (new)
- `.firebaserc` (new)
