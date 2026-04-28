import { X } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useFlashBanner } from './useFlashBanner';

export const FlashBanner: FC = () => {
    const { t } = useTranslation('common');
    const { activeFlash, dismiss } = useFlashBanner();

    if (activeFlash === null) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-md border border-border border-l-4 border-l-accent-alt bg-muted/40 p-3 text-sm"
        >
            <p className="flex-1">{t(`flash.${activeFlash}`)}</p>
            <button
                type="button"
                onClick={dismiss}
                aria-label={t('flash.dismiss')}
                className="text-muted-foreground hover:text-foreground transition-colors"
            >
                <X size={16} aria-hidden="true" />
            </button>
        </div>
    );
};
