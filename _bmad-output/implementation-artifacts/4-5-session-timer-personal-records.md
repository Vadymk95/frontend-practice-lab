# Story 4.5: Session Timer & Personal Records

Status: review

## Story

As a **user**,
I want to time my sessions and track my personal best for each configuration,
So that I can challenge myself to answer questions faster over time.

## Acceptance Criteria

1. **Given** the user enables the timer option in the configurator
   **When** the first question renders
   **Then** a timer starts and displays elapsed time in the question header (MM:SS format)

2. **Given** the session completes with timer active
   **When** the SummaryPage renders
   **Then** the total session duration is shown
   **And** a record key is generated from the session config (categories + difficulty + mode + count)
   **And** if no prior record: the time is saved as the new record via `StorageService.setRecord()`
   **And** if the new time beats the prior record: a congratulation message is shown and the record is updated
   **And** if the new time does not beat the record: the personal best is shown for reference

3. **Given** timer is not enabled
   **When** the session runs
   **Then** no timer UI is shown and no record is saved

## Tasks / Subtasks

- [x] Task 1: Add `timerEnabled` to `SessionConfig` type (AC: #1, #3)
  - [x] In `src/lib/storage/types.ts`, add `timerEnabled?: boolean` to `SessionConfig` interface
  - [x] Default is `undefined` / `false` — timer off by default

- [x] Task 2: Add timer toggle to `SessionConfigurator` (AC: #1)
  - [x] In `useSessionConfigurator.ts`: add `timerEnabled` state (`useState(initialConfig?.timerEnabled ?? false)`)
  - [x] Add `toggleTimer` handler
  - [x] Include `timerEnabled` in the returned `SessionConfig` object passed to `sessionStore.setConfig()`
  - [x] In `SessionConfigurator.tsx`: add a toggle row "Timer" with a `Switch` component (shadcn/ui)
  - [x] Place after the order toggle row

- [x] Task 3: Implement timer in `SessionPlayPage` (AC: #1, #3)
  - [x] In `useSessionPlayPage.ts`:
    - [x] Read `config.timerEnabled` from `sessionStore`
    - [x] If enabled: start `setInterval` on mount that calls `setTimerMs(ms)` every second
    - [x] `timerMs` is already in `sessionStore` — `setTimerMs` is already implemented
    - [x] Clear interval on unmount
    - [x] Expose `timerEnabled` and `timerMs` to the component
  - [x] In `SessionPlayPage.tsx`:
    - [x] If `timerEnabled`: show timer display in header (MM:SS format)
    - [x] Format: `formatTimer(timerMs)` — pad minutes and seconds to 2 digits

- [x] Task 4: Handle timer + records in `useSummaryPage` (AC: #2, #3)
  - [x] Read `config` from `sessionStore` (already available)
  - [x] Read `timerMs` from `sessionStore`
  - [x] If `config.timerEnabled`:
    - [x] Generate record key: `generateRecordKey(config)`
    - [x] Read prior record from `progressStore.records[recordKey]`
    - [x] If no prior record OR `timerMs < priorRecord`: call `progressStore.setRecord(recordKey, timerMs)`
    - [x] Determine `isNewRecord: boolean` and `priorRecordMs: number | undefined`
  - [x] Expose `timerEnabled`, `sessionDurationMs`, `isNewRecord`, `priorRecordMs` to component

- [x] Task 5: Display timer results in `SummaryPage` (AC: #2, #3)
  - [x] If `timerEnabled && sessionDurationMs > 0`:
    - [x] Show total duration: `{t('timer.duration', { time: formatTimer(sessionDurationMs) })}`
    - [x] If `isNewRecord`: show `{t('timer.newRecord')}` — congratulation message
    - [x] Else if `priorRecordMs`: show `{t('timer.personalBest', { time: formatTimer(priorRecordMs) })}`

- [x] Task 6: Add i18n keys (AC: #2)
  - [x] `public/locales/en/session.json` — add `timer.label`
  - [x] `public/locales/en/summary.json` — add `timer.duration`, `timer.newRecord`, `timer.personalBest`
  - [x] `public/locales/ru/session.json` and `ru/summary.json` — same keys in Russian
  - [x] `public/locales/en/home.json` — add `configurator.timer` toggle label
  - [x] `public/locales/ru/home.json` — same

- [x] Task 7: Verification
  - [x] `npm run format`
  - [x] `npm run lint`
  - [x] `npx tsc --noEmit`
  - [x] `npm run test`

## Dev Notes

### `SessionConfig` Type Change

```typescript
// src/lib/storage/types.ts — add optional field
export interface SessionConfig {
    categories: string[];
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'all';
    mode: 'quiz' | 'bug-finding' | 'code-completion' | 'all';
    order: 'random' | 'sequential';
    timerEnabled?: boolean; // NEW — optional, defaults to false
}
```

### `sessionStore` Already Has Timer Fields

```typescript
// sessionStore.ts already has:
timerMs: number;           // milliseconds elapsed
setTimerMs: (ms: number) => void;
```

The timer just needs to be wired in `useSessionPlayPage`.

### Timer Interval Implementation

```typescript
// useSessionPlayPage.ts
const timerEnabled = config?.timerEnabled ?? false;
const timerMs = useSessionStore.use.timerMs();
const setTimerMs = useSessionStore.use.setTimerMs();

useEffect(() => {
    if (!timerEnabled) return;
    const start = Date.now() - timerMs; // resume from existing elapsed time
    const id = setInterval(() => {
        setTimerMs(Date.now() - start);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [timerEnabled]); // only start once when timer is enabled
```

### Timer Format Helper

Create `src/lib/utils/formatTimer.ts` (or add to `src/lib/utils.ts` if it exists):

```typescript
export function formatTimer(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
```

### Record Key Generation

```typescript
// Deterministic key from config — order of categories sorted for stability
export function generateRecordKey(config: SessionConfig): string {
    const cats = [...config.categories].sort().join(',');
    return `${cats}|${config.difficulty}|${config.mode}|${config.questionCount}`;
}
```

### `StorageService.setRecord` Signature

Already defined in `StorageService` interface:
```typescript
setRecord(key: string, ms: number): void;
```

`progressStore` already has `setRecord(key, ms)` action that calls `storageService.setRecord()`.

### SummaryPage Record Logic

```typescript
// useSummaryPage.ts
const timerMs = useSessionStore.use.timerMs();
const config = useSessionStore.use.config();
const records = useProgressStore.use.records();
const setRecord = useProgressStore.use.setRecord();

const timerEnabled = config?.timerEnabled ?? false;
const recordKey = timerEnabled && config ? generateRecordKey(config) : null;
const priorRecord = recordKey ? records[recordKey] : undefined;
const isNewRecord = timerEnabled && recordKey !== null && (priorRecord === undefined || timerMs < priorRecord);

// In mount useEffect — save record if new
if (timerEnabled && recordKey && isNewRecord) {
    setRecord(recordKey, timerMs);
}
```

### Files to Modify / Create

```
src/lib/storage/types.ts                          ← ADD timerEnabled to SessionConfig
src/lib/utils/formatTimer.ts                      ← NEW (or add to existing utils)
src/components/features/SessionConfigurator/
  useSessionConfigurator.ts                        ← ADD timerEnabled state + toggle
  SessionConfigurator.tsx                          ← ADD timer Switch UI
src/pages/SessionPlayPage/
  useSessionPlayPage.ts                            ← ADD timer interval, expose timerMs
  SessionPlayPage.tsx                              ← ADD timer display in header
src/pages/SummaryPage/
  useSummaryPage.ts                               ← ADD record logic, expose timer data
  SummaryPage.tsx                                  ← ADD timer duration + record display
public/locales/en/home.json                        ← ADD configurator.timer label
public/locales/ru/home.json                        ← ADD configurator.timer label
public/locales/en/session.json                     ← ADD timer.label
public/locales/ru/session.json                     ← ADD timer.label
public/locales/en/summary.json                     ← ADD timer.* keys
public/locales/ru/summary.json                     ← ADD timer.* keys
```

---

## Architecture Compliance

- **`timerMs` in `sessionStore`** — timer state is session state (not persisted)
- **Records in `progressStore`** — records are persisted via `storageService`
- **Component pattern**: UI change in `SessionPlayPage.tsx`, logic in `useSessionPlayPage.ts`
- **`generateRecordKey` as pure utility** — deterministic, no side effects
- **`formatTimer` as pure utility** — no side effects, testable

---

## Project Context Reference

- `sessionStore.timerMs` + `setTimerMs` already exist — no store schema changes
- `progressStore.setRecord(key, ms)` already exists — no store schema changes
- `StorageService.setRecord(key, ms)` already in interface + `LocalStorageService`
- After edits: `npm run format && npm run lint && npx tsc --noEmit && npm run test`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Added `timerEnabled?: boolean` to `SessionConfig` interface
- Created `src/components/ui/switch.tsx` using `radix-ui` Switch primitive (already a project dep)
- Wired timer toggle in `useSessionConfigurator` + `SessionConfigurator` (Switch UI after order row)
- Created `src/lib/utils/formatTimer.ts` (pure utility, MM:SS format)
- Created `src/lib/utils/generateRecordKey.ts` (pure utility, deterministic key from config)
- Timer interval in `useSessionPlayPage` — starts on mount when `timerEnabled`, clears on unmount
- Record logic in `useSummaryPage` — checks prior record in `progressStore`, saves if new on mount
- Timer section in `SummaryPage` — shows duration, new record congratulation, or personal best
- i18n keys added for EN + RU in home/session/summary namespaces
- Tests updated in `SummaryPage.test.tsx` to include `records` + `setRecord` in progressStore mock
- New test files: `formatTimer.test.ts` (8 tests), `generateRecordKey.test.ts` (6 tests)
- All 250 tests pass, lint + tsc clean

### Review Findings

_none yet_

### File List

- `src/lib/storage/types.ts` — MODIFY
- `src/lib/utils/formatTimer.ts` — NEW
- `src/lib/utils/formatTimer.test.ts` — NEW
- `src/lib/utils/generateRecordKey.ts` — NEW
- `src/lib/utils/generateRecordKey.test.ts` — NEW
- `src/components/ui/switch.tsx` — NEW
- `src/components/ui/index.ts` — MODIFY
- `src/components/features/SessionConfigurator/useSessionConfigurator.ts` — MODIFY
- `src/components/features/SessionConfigurator/SessionConfigurator.tsx` — MODIFY
- `src/pages/SessionPlayPage/useSessionPlayPage.ts` — MODIFY
- `src/pages/SessionPlayPage/SessionPlayPage.tsx` — MODIFY
- `src/pages/SummaryPage/useSummaryPage.ts` — MODIFY
- `src/pages/SummaryPage/SummaryPage.tsx` — MODIFY
- `src/pages/SummaryPage/SummaryPage.test.tsx` — MODIFY
- `public/locales/en/home.json` — MODIFY
- `public/locales/ru/home.json` — MODIFY
- `public/locales/en/session.json` — MODIFY
- `public/locales/ru/session.json` — MODIFY
- `public/locales/en/summary.json` — MODIFY
- `public/locales/ru/summary.json` — MODIFY

## Change Log

- 2026-04-10: Story 4.5 implemented — session timer + personal records. Added `timerEnabled` to `SessionConfig`, Switch toggle in configurator, timer interval in play page, record key generation and persistence in summary, i18n keys for EN/RU. 14 new tests added (250 total passing).
