import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { PresetRow } from '@/components/features/PresetList/PresetRow';
import { SessionConfigurator } from '@/components/features/SessionConfigurator';
import { usePresetStore } from '@/store/presets';

export const HomePage: FC = () => {
    const { t } = useTranslation('home');
    const presets = usePresetStore.use.presets();

    return (
        <div className="container mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
            <SessionConfigurator />
            <div className="flex flex-col gap-2">
                {presets.length > 0 ? (
                    presets.map((p) => <PresetRow key={p.id} preset={p} />)
                ) : (
                    <p className="text-sm text-muted-foreground text-center">
                        {t('presets.empty')}
                    </p>
                )}
            </div>
        </div>
    );
};
