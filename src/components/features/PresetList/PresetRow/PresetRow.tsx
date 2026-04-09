import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionPreset } from '@/lib/storage/types';

import { usePresetRow } from './usePresetRow';

interface PresetRowProps {
    preset: SessionPreset;
}

export const PresetRow: FC<PresetRowProps> = ({ preset }) => {
    const { t } = useTranslation('home');
    const { configSummary, handleLaunch } = usePresetRow(preset);

    const relativeDate = (() => {
        const ms = new Date(preset.lastUsedAt).getTime();
        if (isNaN(ms)) return '';
        const days = Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
        if (days === 0) return t('preset.lastUsed.today');
        if (days === 1) return t('preset.lastUsed.yesterday');
        return t('preset.lastUsed.daysAgo', { count: days });
    })();

    return (
        <button
            type="button"
            aria-label={preset.name}
            onClick={handleLaunch}
            className="w-full text-left px-4 py-3 border border-border bg-surface hover:border-accent-alt/50 transition-colors"
        >
            <div className="text-sm font-medium text-foreground">{preset.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{configSummary}</div>
            {relativeDate && (
                <div className="text-xs text-muted-foreground mt-0.5">{relativeDate}</div>
            )}
        </button>
    );
};
