import { Moon, Settings, Sun } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ResetWeightsDialog } from '@/components/features/ResetWeightsDialog';
import { RoutesPath } from '@/router/routes';

import { useAppHeader } from './useAppHeader';

const CONTROL_CLASS =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-alt';

export const AppHeader: FC = () => {
    const { theme, language, handleLanguageToggle, handleThemeToggle, resetDialog } =
        useAppHeader();
    const { t } = useTranslation('common');

    return (
        <>
            <header className="w-full border-b border-border bg-background px-4 py-3 md:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <Link
                        to={RoutesPath.Root}
                        className="font-mono font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-alt rounded"
                    >
                        InterviewOS
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            aria-label={t(
                                language === 'ru' ? 'header.switchToEn' : 'header.switchToRu'
                            )}
                            onClick={handleLanguageToggle}
                            className={CONTROL_CLASS}
                        >
                            {language.toUpperCase()}
                        </button>
                        {/* Icon and label name the same thing — the theme the click leads to. */}
                        <button
                            type="button"
                            aria-label={t(
                                theme === 'dark' ? 'header.switchToLight' : 'header.switchToDark'
                            )}
                            onClick={handleThemeToggle}
                            className={CONTROL_CLASS}
                        >
                            {theme === 'dark' ? (
                                <Sun size={16} aria-hidden="true" />
                            ) : (
                                <Moon size={16} aria-hidden="true" />
                            )}
                        </button>
                        <button
                            type="button"
                            aria-label={t('resetWeights.title')}
                            onClick={resetDialog.open}
                            className={CONTROL_CLASS}
                        >
                            <Settings size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </header>
            <ResetWeightsDialog
                isOpen={resetDialog.isOpen}
                close={resetDialog.close}
                resetAll={resetDialog.resetAll}
                resetCategory={resetDialog.resetCategory}
                categories={resetDialog.categories}
                successMessage={resetDialog.successMessage}
                errorMessage={resetDialog.errorMessage}
                isConfirmingAll={resetDialog.isConfirmingAll}
                requestResetAll={resetDialog.requestResetAll}
                cancelResetAll={resetDialog.cancelResetAll}
            />
        </>
    );
};
