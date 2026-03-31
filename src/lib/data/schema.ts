import { z } from 'zod';

const BaseQuestionSchema = z.object({
    id: z.string(),
    type: z.enum(['single-choice', 'multi-choice', 'bug-finding', 'code-completion']),
    category: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()),
    question: z.string(),
    explanation: z.string()
});

export const SingleChoiceSchema = BaseQuestionSchema.extend({
    type: z.literal('single-choice'),
    options: z.array(z.string()),
    correct: z.number().int().nonnegative()
});

export const MultiChoiceSchema = BaseQuestionSchema.extend({
    type: z.literal('multi-choice'),
    options: z.array(z.string()),
    correct: z.array(z.number().int().nonnegative())
});

export const BugFindingSchema = BaseQuestionSchema.extend({
    type: z.literal('bug-finding'),
    code: z.string(),
    options: z.array(z.string()).min(1).optional(),
    correct: z.string(),
    referenceAnswer: z.string()
});

export const CodeCompletionSchema = BaseQuestionSchema.extend({
    type: z.literal('code-completion'),
    code: z.string(),
    blanks: z.array(z.string()),
    referenceAnswer: z.string()
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
