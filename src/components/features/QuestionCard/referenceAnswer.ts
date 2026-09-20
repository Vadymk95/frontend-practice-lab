import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { ReferenceAnswer } from '@/lib/data/schema';
import { pickLocalized } from '@/lib/i18n/localized';

/**
 * Resolves a reference answer for the active language. An entry whose translation is empty
 * falls back to the English text, so a blank translation never renders a blank solution panel.
 */
export const resolveReferenceAnswer = (
    value: ReferenceAnswer,
    lang: string | undefined
): string => {
    const text = pickLocalized(value, lang);
    return text.trim() === '' ? value.en : text;
};

export const useReferenceAnswer = (): ((value: ReferenceAnswer) => string) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    return useCallback((value: ReferenceAnswer) => resolveReferenceAnswer(value, lang), [lang]);
};
