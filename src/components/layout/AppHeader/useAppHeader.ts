import i18next from 'i18next';

import { useResetWeightsDialog } from '@/components/features/ResetWeightsDialog';
import { track } from '@/lib/analytics';
import { useUiStore } from '@/store/ui';

export const useAppHeader = () => {
    const theme = useUiStore.use.theme();
    const setTheme = useUiStore.use.setTheme();
    const language = useUiStore.use.language();
    const setLanguage = useUiStore.use.setLanguage();
    const resetDialog = useResetWeightsDialog();

    const handleLanguageToggle = () => {
        const next = language === 'ru' ? 'en' : 'ru';
        setLanguage(next);
        void i18next.changeLanguage(next);
        track('language_changed', { to: next });
    };

    const handleThemeToggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        track('theme_changed', { to: next });
    };

    return { theme, language, handleLanguageToggle, handleThemeToggle, resetDialog };
};
