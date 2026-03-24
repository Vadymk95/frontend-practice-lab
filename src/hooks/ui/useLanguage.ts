import { useEffect } from 'react';

import i18next from '@/lib/i18n';
import { useUiStore } from '@/store/ui';

export function useLanguage() {
    const language = useUiStore.use.language();
    const setLanguageInStore = useUiStore.use.setLanguage();

    useEffect(() => {
        void i18next.changeLanguage(language);
    }, [language]);

    const changeLanguage = (lang: 'ru' | 'en') => {
        setLanguageInStore(lang);
    };

    return { language, changeLanguage };
}
