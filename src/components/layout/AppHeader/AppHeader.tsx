import { Moon } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppHeader } from './useAppHeader';

export const AppHeader: FC = () => {
    useAppHeader();
    const { t } = useTranslation('common');

    return (
        <header className="w-full border-b border-border bg-background px-4 py-3 md:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-accent">InterviewOS</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={t('header.toggleLanguage')}
                        className="rounded px-2 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-alt"
                    >
                        {t('header.languageLabel')}
                    </button>
                    <button
                        type="button"
                        aria-label={t('header.toggleTheme')}
                        className="rounded p-1 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-alt"
                    >
                        <Moon size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </header>
    );
};
