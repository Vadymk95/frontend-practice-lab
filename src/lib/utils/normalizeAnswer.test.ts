import { describe, expect, it } from 'vitest';

import { normalizeAnswer } from './normalizeAnswer';

describe('normalizeAnswer', () => {
    it('trims and lowercases', () => {
        expect(normalizeAnswer('  UseMemo  ')).toBe(normalizeAnswer('usememo'));
    });

    it('accepts a smart single quote for a straight one — the phone keyboard substitutes it', () => {
        expect(normalizeAnswer('’assistant’')).toBe(normalizeAnswer("'assistant'"));
        expect(normalizeAnswer('‘RS256’')).toBe(normalizeAnswer("'RS256'"));
    });

    it('accepts smart double quotes for straight ones', () => {
        expect(normalizeAnswer('“RS256”')).toBe(normalizeAnswer('"RS256"'));
    });

    it('collapses internal whitespace runs', () => {
        expect(normalizeAnswer('[onSearch,   query]')).toBe(normalizeAnswer('[onSearch, query]'));
        expect(normalizeAnswer('push\t-m')).toBe(normalizeAnswer('push -m'));
        expect(normalizeAnswer('singleton:\ntrue')).toBe(normalizeAnswer('singleton: true'));
    });

    it('does not erase a meaningful space', () => {
        expect(normalizeAnswer('push -m')).not.toBe(normalizeAnswer('push-m'));
    });

    it('strips one trailing semicolon', () => {
        expect(normalizeAnswer('const a = 1;')).toBe(normalizeAnswer('const a = 1'));
    });

    it('strips only one trailing semicolon', () => {
        expect(normalizeAnswer('const a = 1;')).toBe('const a = 1');
        expect(normalizeAnswer('const a = 1;;')).toBe('const a = 1;');
    });

    it('ignores whitespace around a trailing semicolon', () => {
        expect(normalizeAnswer('done ;  ')).toBe(normalizeAnswer('done'));
    });

    it('keeps a semicolon that is not at the end', () => {
        expect(normalizeAnswer('a; b')).not.toBe(normalizeAnswer('a b'));
    });

    it('leaves an empty answer empty', () => {
        expect(normalizeAnswer('   ')).toBe('');
    });
});
