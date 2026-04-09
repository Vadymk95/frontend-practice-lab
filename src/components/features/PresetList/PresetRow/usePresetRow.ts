import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { SessionPreset } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useSessionStore } from '@/store/session';

export function usePresetRow(preset: SessionPreset) {
    const navigate = useNavigate();
    const updateLastUsed = usePresetStore.use.updateLastUsed();
    const setConfig = useSessionStore.use.setConfig();

    const configSummary = (() => {
        const { categories, difficulty, questionCount } = preset.config;
        const catPart = categories.slice(0, 2).join('+') + (categories.length > 2 ? '+…' : '');
        return `${catPart} · ${difficulty} · ${questionCount}q`;
    })();

    const handleLaunch = useCallback(() => {
        updateLastUsed(preset.id);
        setConfig(preset.config);
        navigate(RoutesPath.SessionPlay);
    }, [preset, updateLastUsed, setConfig, navigate]);

    return { configSummary, handleLaunch };
}
