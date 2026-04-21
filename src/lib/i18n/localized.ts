import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, type SupportedLanguage } from './constants';

export interface Localized {
    en: string;
    ru: string;
}

function resolveLang(lang: string | undefined): SupportedLanguage {
    const l = (lang ?? DEFAULT_LANGUAGE).toLowerCase();
    return l.startsWith('ru') ? 'ru' : 'en';
}

export function pickLocalized(loc: Localized, lang: string | undefined): string {
    return loc[resolveLang(lang)];
}

export function useLocalized(): (loc: Localized) => string {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    return useCallback((loc: Localized) => pickLocalized(loc, lang), [lang]);
}
