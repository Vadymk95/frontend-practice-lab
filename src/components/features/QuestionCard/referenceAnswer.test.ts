import { describe, expect, it } from 'vitest';

import { resolveReferenceAnswer } from './referenceAnswer';

describe('resolveReferenceAnswer', () => {
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
