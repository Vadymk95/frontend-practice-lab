import { describe, expect, it } from 'vitest';

import { resolveReferenceAnswer } from './referenceAnswer';

describe('resolveReferenceAnswer', () => {
    it('keeps a legacy plain-string answer in every language', () => {
        expect(resolveReferenceAnswer('Move the catch to the end.', 'ru')).toBe(
            'Move the catch to the end.'
        );
        expect(resolveReferenceAnswer('Move the catch to the end.', 'en')).toBe(
            'Move the catch to the end.'
        );
    });

    it('picks the translation matching the active language', () => {
        const answer = { en: 'Move the catch.', ru: 'Перенесите catch.' };
        expect(resolveReferenceAnswer(answer, 'ru')).toBe('Перенесите catch.');
        expect(resolveReferenceAnswer(answer, 'en-GB')).toBe('Move the catch.');
    });

    it('falls back to English when the translation is still empty', () => {
        expect(resolveReferenceAnswer({ en: 'Move the catch.', ru: '   ' }, 'ru')).toBe(
            'Move the catch.'
        );
    });
});
