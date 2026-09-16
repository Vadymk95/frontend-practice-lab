import { describe, expect, it } from 'vitest';

import { parseInlineMarkdown } from './inlineMarkdown';

describe('parseInlineMarkdown', () => {
    it('returns no segments for an empty string', () => {
        expect(parseInlineMarkdown('')).toEqual([]);
    });

    it('keeps plain prose as a single text segment', () => {
        expect(parseInlineMarkdown('typeof null is object')).toEqual([
            { type: 'text', value: 'typeof null is object' }
        ]);
    });

    it('extracts a backtick code span between prose', () => {
        expect(parseInlineMarkdown('What does `typeof null` return?')).toEqual([
            { type: 'text', value: 'What does ' },
            { type: 'code', value: 'typeof null' },
            { type: 'text', value: ' return?' }
        ]);
    });

    it('extracts every code span, not only the first', () => {
        expect(parseInlineMarkdown('`a` and `b`')).toEqual([
            { type: 'code', value: 'a' },
            { type: 'text', value: ' and ' },
            { type: 'code', value: 'b' }
        ]);
    });

    it('extracts bold spans', () => {
        expect(parseInlineMarkdown('this is **not** allowed')).toEqual([
            { type: 'text', value: 'this is ' },
            { type: 'bold', value: 'not' },
            { type: 'text', value: ' allowed' }
        ]);
    });

    it('keeps an unclosed backtick literal', () => {
        expect(parseInlineMarkdown('a ` b')).toEqual([{ type: 'text', value: 'a ` b' }]);
    });

    it('keeps an unclosed bold marker literal', () => {
        expect(parseInlineMarkdown('2 ** 3')).toEqual([{ type: 'text', value: '2 ** 3' }]);
    });

    it('does not treat markers inside a code span as markup', () => {
        expect(parseInlineMarkdown('`a ** b`')).toEqual([{ type: 'code', value: 'a ** b' }]);
    });

    it('turns newlines into break segments', () => {
        expect(parseInlineMarkdown('one\ntwo')).toEqual([
            { type: 'text', value: 'one' },
            { type: 'break' },
            { type: 'text', value: 'two' }
        ]);
    });

    it('leaves HTML literal — markup is never produced from the source', () => {
        expect(parseInlineMarkdown('<img src=x onerror="alert(1)">')).toEqual([
            { type: 'text', value: '<img src=x onerror="alert(1)">' }
        ]);
    });

    it('ignores an empty code span', () => {
        expect(parseInlineMarkdown('a `` b')).toEqual([{ type: 'text', value: 'a `` b' }]);
    });
});
