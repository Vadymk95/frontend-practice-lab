import { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';

import { PresetRow } from '@/components/features/PresetList/PresetRow';
import { PrimaryPresetCard } from '@/components/features/PresetList/PrimaryPresetCard';
import { SessionConfigurator } from '@/components/features/SessionConfigurator';
import type { SessionConfig } from '@/lib/storage/types';
import { usePresetStore } from '@/store/presets';

export const HomePage: FC = () => {
    const presets = usePresetStore.use.presets();
    const [modifyConfig, setModifyConfig] = useState<SessionConfig | undefined>(undefined);
    const [modifyKey, setModifyKey] = useState(0);

    const sortedPresets = useMemo(
        () => [...presets].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)),
        [presets]
    );

    const mruPreset = sortedPresets[0];
    const secondaryPresets = sortedPresets.slice(1);

    const handleModify = useCallback((config: SessionConfig) => {
        setModifyConfig(config);
        setModifyKey((k) => k + 1);
    }, []);

    return (
        <div className="container mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
            {mruPreset && <PrimaryPresetCard preset={mruPreset} onModify={handleModify} />}
            <SessionConfigurator key={modifyKey} initialConfig={modifyConfig} />
            {secondaryPresets.length > 0 && (
                <div className="flex flex-col gap-2">
                    {secondaryPresets.map((p) => (
                        <PresetRow key={p.id} preset={p} />
                    ))}
                </div>
            )}
        </div>
    );
};
