import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useCategoryDisplay(): (slug: string, fallback?: string) => string {
    const { t } = useTranslation('home');
    return useCallback(
        (slug: string, fallback?: string) =>
            t(`categories.${slug}.display`, { defaultValue: fallback ?? slug }),
        [t]
    );
}
