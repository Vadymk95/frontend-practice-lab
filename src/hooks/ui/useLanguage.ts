import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { SupportedLanguage } from '@/lib/i18n/constants';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/lib/i18n/constants';
import { useUiStore } from '@/store/ui';

/** The detector can hand back a regional tag ("en-GB"); the UI only knows the base ones. */
export function normalizeLanguage(raw: string | undefined): SupportedLanguage {
    const base = (raw ?? '').split('-')[0]?.toLowerCase() ?? '';
    return SUPPORTED_LANGUAGES.includes(base as SupportedLanguage)
        ? (base as SupportedLanguage)
        : DEFAULT_LANGUAGE;
}

/**
 * Single source of truth for the active language: i18next is what actually
 * renders, so the UI reads it from there. The ui store keeps its own copy only
 * to persist the choice — reading the store for display let the header show a
 * language the app was not rendering.
 */
export function useLanguage() {
    const { i18n } = useTranslation();
    const setLanguageInStore = useUiStore.use.setLanguage();

    const language = normalizeLanguage(i18n.language);

    const changeLanguage = useCallback(
        (lang: SupportedLanguage) => {
            void i18n.changeLanguage(lang);
            setLanguageInStore(lang);
        },
        [i18n, setLanguageInStore]
    );

    return { language, changeLanguage };
}
