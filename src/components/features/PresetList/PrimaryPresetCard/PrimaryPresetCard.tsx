import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { SessionConfig, SessionPreset } from '@/lib/storage/types';

import { usePrimaryPresetCard } from './usePrimaryPresetCard';

interface PrimaryPresetCardProps {
    preset: SessionPreset;
    onModify: (config: SessionConfig) => void;
}

export const PrimaryPresetCard: FC<PrimaryPresetCardProps> = ({ preset, onModify }) => {
    const { t } = useTranslation('home');
    const { handleStart, handleModify } = usePrimaryPresetCard(preset, onModify);

    return (
        <div className="border border-accent-alt bg-accent-alt/5 px-4 py-4 flex flex-col gap-3">
            <div className="text-base font-semibold text-foreground">{preset.name}</div>
            <div className="flex items-center gap-3">
                <Button className="flex-1" onClick={handleStart}>
                    {t('presets.primaryCard.start')}
                </Button>
                <button
                    type="button"
                    onClick={handleModify}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                    {t('presets.primaryCard.modify')}
                </button>
            </div>
        </div>
    );
};
