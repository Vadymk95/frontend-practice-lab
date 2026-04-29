import { describe, expect, it } from 'vitest';

import { CodeCompletionSchema } from './schema';

const baseCC = {
    id: 'cc-1',
    type: 'code-completion' as const,
    category: 'js',
    difficulty: 'easy' as const,
    tags: ['blanks'],
    question: { en: 'Fill the blank', ru: 'Заполните пропуск' },
    explanation: { en: 'because.', ru: 'потому что.' },
    referenceAnswer: 'const x = 1'
};

describe('CodeCompletionSchema __BLANK__ refinement', () => {
    it('accepts code where marker count matches blanks.length', () => {
        const ok = CodeCompletionSchema.safeParse({
            ...baseCC,
            code: 'const __BLANK__ = __BLANK__',
            blanks: ['x', '1']
        });
        expect(ok.success).toBe(true);
    });

    it('rejects code with too few markers', () => {
        const bad = CodeCompletionSchema.safeParse({
            ...baseCC,
            code: 'const __BLANK__ = 1',
            blanks: ['x', '1']
        });
        expect(bad.success).toBe(false);
        if (!bad.success) {
            expect(bad.error.issues[0]?.path).toEqual(['code']);
        }
    });

    it('rejects code with too many markers', () => {
        const bad = CodeCompletionSchema.safeParse({
            ...baseCC,
            code: '__BLANK__ __BLANK__ __BLANK__',
            blanks: ['a', 'b']
        });
        expect(bad.success).toBe(false);
    });

    it('accepts the legacy-look-alike `___` only when blanks length is also zero', () => {
        // After migration, a literal `___` is just code text, not a blank marker.
        // The schema does not interpret `___` — only `__BLANK__`.
        const ok = CodeCompletionSchema.safeParse({
            ...baseCC,
            code: '// uses ___ as a divider, no blanks here',
            blanks: []
        });
        expect(ok.success).toBe(true);
    });
});
