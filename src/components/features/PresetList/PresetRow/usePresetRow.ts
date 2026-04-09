import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { SessionPreset } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useSessionStore } from '@/store/session';

export function usePresetRow(preset: SessionPreset) {
    const navigate = useNavigate();
    const updateLastUsed = usePresetStore.use.updateLastUsed();
    const deletePreset = usePresetStore.use.deletePreset();
    const setConfig = useSessionStore.use.setConfig();

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const handleLaunch = useCallback(() => {
        updateLastUsed(preset.id);
        setConfig(preset.config);
        navigate(RoutesPath.SessionPlay);
    }, [preset, updateLastUsed, setConfig, navigate]);

    const handleDeleteRequest = useCallback(() => setIsDeleteOpen(true), []);
    const handleDeleteConfirm = useCallback(() => {
        deletePreset(preset.id);
        setIsDeleteOpen(false);
    }, [preset.id, deletePreset]);
    const handleDeleteCancel = useCallback(() => setIsDeleteOpen(false), []);

    const handleDialogOpenChange = useCallback(
        (open: boolean) => {
            if (!open) handleDeleteCancel();
        },
        [handleDeleteCancel]
    );

    return {
        handleLaunch,
        isDeleteOpen,
        handleDialogOpenChange,
        handleDeleteRequest,
        handleDeleteConfirm,
        handleDeleteCancel
    };
}
