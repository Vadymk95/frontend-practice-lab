import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { track } from '@/lib/analytics';
import { storageService } from '@/lib/storage';
import type { SessionConfig, SessionPreset } from '@/lib/storage/types';
import { createSelectors } from '@/store/utils/createSelectors';

interface PresetState {
    presets: SessionPreset[];
    savePreset: (config: SessionConfig, name: string) => void;
    updateLastUsed: (id: string) => void;
    deletePreset: (id: string) => void;
}

const usePresetStoreBase = create<PresetState>()(
    devtools(
        (set, get) => ({
            presets: storageService.getPresets(),
            savePreset: (config: SessionConfig, name: string) => {
                const preset: SessionPreset = {
                    id: crypto.randomUUID(),
                    name,
                    config,
                    createdAt: new Date().toISOString(),
                    lastUsedAt: new Date().toISOString()
                };
                storageService.savePreset(preset);
                set({ presets: storageService.getPresets() }, false, {
                    type: 'preset-store/savePreset'
                });
                track('preset_saved', {});
            },
            updateLastUsed: (id: string) => {
                const preset = get().presets.find((p) => p.id === id);
                if (!preset) return;
                const updated = { ...preset, lastUsedAt: new Date().toISOString() };
                storageService.savePreset(updated);
                set({ presets: storageService.getPresets() }, false, {
                    type: 'preset-store/updateLastUsed'
                });
                track('preset_loaded', {});
            },
            deletePreset: (id: string) => {
                storageService.deletePreset(id);
                set({ presets: storageService.getPresets() }, false, {
                    type: 'preset-store/deletePreset'
                });
            }
        }),
        { name: 'preset-store' }
    )
);

export const usePresetStore = createSelectors(usePresetStoreBase);
export { usePresetStoreBase };
