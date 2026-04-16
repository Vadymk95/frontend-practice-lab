import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PwaInstallToast } from '@/components/common/PwaInstallToast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Footer } from '@/components/layout/Footer';
import { Main } from '@/components/layout/Main';
import { useI18nReload } from '@/hooks/i18n/useI18nReload';
import { useTheme } from '@/hooks/ui/useTheme';

export const App: FC = () => {
    // Hot reload translations in development mode
    useI18nReload();
    // Hydrate uiStore from localStorage and apply theme class on mount
    useTheme();
    const { t } = useTranslation('common');

    return (
        <ErrorBoundary>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-accent-alt focus:bg-background focus:px-4 focus:py-2 focus:text-text-primary"
            >
                {t('skipToContent')}
            </a>
            <div className="flex min-h-screen flex-col">
                <AppHeader />
                <Main />
                <Footer />
                <PwaInstallToast />
            </div>
        </ErrorBoundary>
    );
};
