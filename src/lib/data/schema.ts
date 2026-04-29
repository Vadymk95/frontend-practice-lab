import { z } from 'zod';

const LocalizedStringSchema = z.object({
    en: z.string(),
    ru: z.string()
});

export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

const BaseQuestionSchema = z.object({
    id: z.string(),
    type: z.enum(['single-choice', 'multi-choice', 'bug-finding', 'code-completion']),
    category: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()),
    question: LocalizedStringSchema,
    explanation: LocalizedStringSchema
});

export const SingleChoiceSchema = BaseQuestionSchema.extend({
    type: z.literal('single-choice'),
    options: z.array(LocalizedStringSchema),
    correct: z.number().int().nonnegative()
});

export const MultiChoiceSchema = BaseQuestionSchema.extend({
    type: z.literal('multi-choice'),
    options: z.array(LocalizedStringSchema),
    correct: z.array(z.number().int().nonnegative())
});

// BugFinding: when `options` is present, `correct` is the 0-based index of the correct option.
// When `options` is absent (free-text mode), `correct` is a reference string used only for
// authoring context — it is never shown to the user or compared at runtime (scoring comes
// from self-assessment: gotIt/missedIt).
export const BugFindingSchema = BaseQuestionSchema.extend({
    type: z.literal('bug-finding'),
    code: z.string(),
    options: z.array(LocalizedStringSchema).min(1).optional(),
    correct: z.union([z.number().int().nonnegative(), z.string()]),
    referenceAnswer: z.string()
});

// CodeCompletion: `code`, `blanks`, `lang`, `referenceAnswer` are language-agnostic
// (source code / identifiers / code snippets).
//
// Authoring invariant: every `__BLANK__` marker in `code` maps 1:1 to a `blanks`
// entry. Enforced at the schema level so CI's `validate:data` step blocks any
// PR that introduces a mismatch (the previous DEV-only console.warn missed 138
// broken questions in production data — see bug-fix story 2026-04-29).
export const CodeCompletionSchema = BaseQuestionSchema.extend({
    type: z.literal('code-completion'),
    code: z.string(),
    blanks: z.array(z.string()),
    lang: z.string().optional(),
    referenceAnswer: z.string()
}).refine((q) => q.code.split('__BLANK__').length - 1 === q.blanks.length, {
    message: "code-completion: '__BLANK__' marker count in code must equal blanks.length",
    path: ['code']
});

export const QuestionSchema = z.discriminatedUnion('type', [
    SingleChoiceSchema,
    MultiChoiceSchema,
    BugFindingSchema,
    CodeCompletionSchema
]);

export const CategoryFileSchema = z.array(QuestionSchema);

export type SingleChoiceQuestion = z.infer<typeof SingleChoiceSchema>;
export type MultiChoiceQuestion = z.infer<typeof MultiChoiceSchema>;
export type BugFindingQuestion = z.infer<typeof BugFindingSchema>;
export type CodeCompletionQuestion = z.infer<typeof CodeCompletionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionType = Question['type'];
