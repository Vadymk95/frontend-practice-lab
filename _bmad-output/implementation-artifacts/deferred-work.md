# Deferred Work

## Deferred from: code review of 2-3-bug-finding-question (2026-03-31)

- `SelfAssessment` type duplicated in BugFindingQuestion.tsx and useBugFindingQuestion.ts — compile-safe but code smell; consider extracting to shared types file
- No callback unregistration/cleanup in useEffect registration pattern — pre-existing architectural pattern from Story 2.1 (onCheckRegister), should be addressed at architecture level across all question types
- `question.correct` not validated against options array in BugFindingSchema — schema.ts allows correct value that doesn't exist in options; UI silently shows no correct answer; consider adding `.refine()` validator
- Stale closure risk: parent may call old registered callback during question transition window — pre-existing pattern in callback registration design; low probability in current usage
