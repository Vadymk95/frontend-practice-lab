import type { FC } from 'react';

import { PresetRow } from '@/components/features/PresetList/PresetRow';
import { SessionConfigurator } from '@/components/features/SessionConfigurator';
import { usePresetStore } from '@/store/presets';

export const HomePage: FC = () => {
    const presets = usePresetStore.use.presets();

    return (
        <div className="container mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
            <SessionConfigurator />
            {presets.length > 0 && (
                <div className="flex flex-col gap-2">
                    {presets.map((p) => (
                        <PresetRow key={p.id} preset={p} />
                    ))}
                </div>
            )}
        </div>
    );
};
