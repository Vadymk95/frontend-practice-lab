import { useResetWeightsDialog } from '@/components/features/ResetWeightsDialog';
import { useLanguage } from '@/hooks/ui/useLanguage';
import { track } from '@/lib/analytics';
import { useUiStore } from '@/store/ui';

export const useAppHeader = () => {
    const theme = useUiStore.use.theme();
    const setTheme = useUiStore.use.setTheme();
    const { language, changeLanguage } = useLanguage();
    const resetDialog = useResetWeightsDialog();

    const handleLanguageToggle = () => {
        const next = language === 'ru' ? 'en' : 'ru';
        changeLanguage(next);
        track('language_changed', { to: next });
    };

    const handleThemeToggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        track('theme_changed', { to: next });
    };

    return { theme, language, handleLanguageToggle, handleThemeToggle, resetDialog };
};
