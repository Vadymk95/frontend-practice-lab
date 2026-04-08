# Deferred Work

## Deferred from: code review of 2-3-bug-finding-question (2026-03-31)

- `SelfAssessment` type duplicated in BugFindingQuestion.tsx and useBugFindingQuestion.ts — compile-safe but code smell; consider extracting to shared types file
- No callback unregistration/cleanup in useEffect registration pattern — pre-existing architectural pattern from Story 2.1 (onCheckRegister), should be addressed at architecture level across all question types
- `question.correct` not validated against options array in BugFindingSchema — schema.ts allows correct value that doesn't exist in options; UI silently shows no correct answer; consider adding `.refine()` validator
- Stale closure risk: parent may call old registered callback during question transition window — pre-existing pattern in callback registration design; low probability in current usage

## Deferred from: code review of 2-4-code-completion-question-blank-inputs (2026-04-08)

- Mobile sticky bar (Submit/Check/Next) has no explicit z-index — pre-existing pattern across all question type sticky bars in SessionPlayPage; `bg-background` provides visual coverage in current layout; address if stacking context issues emerge
- `onSubmit` exported from `useCodeCompletionQuestion` hook but component doesn't use it directly — same pattern as BugFindingQuestion; submission is via registered ref callback; deferred for consistency

## Deferred from: code review of 2-5-back-button-misclick-protection (2026-04-08)

- Store test (`sessionStore.test.ts`) imports `useSessionStore` (selector wrapper) instead of `useSessionStoreBase` — SKELETONS convention; functionally correct since `createSelectors` mutates same reference; 90%+ project tests follow this pattern; address in a test convention cleanup sweep
- `resetKey` in `QuestionCard` does not reset to 0 on forward question navigation — by design; child components reset via `useEffect([question.id])`; only becomes an issue if child components are refactored to not reset on prop change
- No test assertion that `key={resetKey}` forces child component remount on Back press — indirect coverage via "hides Back button" + "removes answer" tests; direct test would require reaching into component internals (anti-pattern)
- `isAnswered` derived independently in `useSessionPlayPage` and `useQuestionCard` — pre-existing DRY violation; single source of truth would be a shared selector or derived store field; low risk while logic stays simple
