import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { ReferenceAnswer } from '@/lib/data/schema';
import { pickLocalized } from '@/lib/i18n/localized';

/**
 * Resolves a reference answer for the active language. The legacy bare-string form and a
 * localized entry whose translation is still empty both fall back to the English text, so a
 * half-migrated bank never renders a blank solution panel.
 */
export const resolveReferenceAnswer = (
    value: ReferenceAnswer,
    lang: string | undefined
): string => {
    if (typeof value === 'string') return value;
    const text = pickLocalized(value, lang);
    return text.trim() === '' ? value.en : text;
};

export const useReferenceAnswer = (): ((value: ReferenceAnswer) => string) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    return useCallback((value: ReferenceAnswer) => resolveReferenceAnswer(value, lang), [lang]);
};
