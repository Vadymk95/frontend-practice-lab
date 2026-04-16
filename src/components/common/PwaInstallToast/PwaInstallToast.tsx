import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import { usePwaInstallToast } from './usePwaInstallToast';

export const PwaInstallToast: FC = () => {
    const { t } = useTranslation('common');
    const { isVisible, dismiss, install } = usePwaInstallToast();

    if (!isVisible) return null;

    return (
        <div
            role="dialog"
            aria-label={t('pwa.installPrompt')}
            className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-4 shadow-lg md:left-auto md:right-4 md:w-80"
        >
            <p className="text-sm text-text-primary">{t('pwa.installPrompt')}</p>
            <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={install}>
                    {t('pwa.install')}
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                    {t('pwa.dismiss')}
                </Button>
            </div>
        </div>
    );
};
