import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

    const handleStart = useCallback(() => {
        updateLastUsed(preset.id);
        setConfig(preset.config);
        navigate(RoutesPath.SessionPlay);
    }, [preset.id, preset.config, updateLastUsed, setConfig, navigate]);

    const handleModify = useCallback(() => {
        onModify(preset.config);
    }, [preset.config, onModify]);

    return { handleStart, handleModify };
}
