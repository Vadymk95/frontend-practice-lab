import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FlashState } from '@/components/common/FlashBanner';
import { resolvePresetConfig } from '@/components/features/PresetList/resolvePresetConfig';
import { useCategories } from '@/hooks/data/useCategories';
import type { SessionConfig, SessionPreset } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useSessionStore } from '@/store/session';

export function usePrimaryPresetCard(
    preset: SessionPreset,
    onModify: (config: SessionConfig) => void
) {
    const navigate = useNavigate();
    const updateLastUsed = usePresetStore.use.updateLastUsed();
    const setConfig = useSessionStore.use.setConfig();
    const { data: categories = [] } = useCategories();

    const handleStart = useCallback(() => {
        const config = resolvePresetConfig(preset.config, categories);
        if (!config) {
            const state: FlashState = { flash: 'presetOutdated' };
            navigate(RoutesPath.Root, { replace: true, state });
            return;
        }
        updateLastUsed(preset.id);
        setConfig(config);
        navigate(RoutesPath.SessionPlay);
    }, [preset.id, preset.config, categories, updateLastUsed, setConfig, navigate]);

    const handleModify = useCallback(() => {
        onModify(preset.config);
    }, [preset.config, onModify]);

    return { handleStart, handleModify };
}
