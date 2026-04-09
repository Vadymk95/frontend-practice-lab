import { beforeEach, describe, expect, it } from 'vitest';

import { storageService } from '@/lib/storage';
import type { SessionConfig, SessionPreset } from '@/lib/storage/types';

import { usePresetStoreBase } from './presetStore';

const baseConfig: SessionConfig = {
    categories: ['js'],
    questionCount: 10,
    difficulty: 'all',
    mode: 'all',
    order: 'random'
};

beforeEach(() => {
    usePresetStoreBase.setState({ presets: [] });
    localStorage.clear();
});

describe('presetStore', () => {
    describe('savePreset', () => {
        it('adds preset to the list', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'JS · all · 10q');

            const { presets } = usePresetStoreBase.getState();
            expect(presets).toHaveLength(1);
            expect(presets[0].name).toBe('JS · all · 10q');
        });

        it('persists preset config', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'Test');

            const { presets } = usePresetStoreBase.getState();
            expect(presets[0].config).toEqual(baseConfig);
        });

        it('sets createdAt and lastUsedAt as ISO strings', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'Test');

            const preset = usePresetStoreBase.getState().presets[0];
            expect(() => new Date(preset.createdAt).toISOString()).not.toThrow();
            expect(() => new Date(preset.lastUsedAt).toISOString()).not.toThrow();
        });

        it('generates unique ids for multiple presets', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'First');
            usePresetStoreBase.getState().savePreset(baseConfig, 'Second');

            const { presets } = usePresetStoreBase.getState();
            expect(presets).toHaveLength(2);
            expect(presets[0].id).not.toBe(presets[1].id);
        });
    });

    describe('deletePreset', () => {
        it('removes the preset from the list', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'ToDelete');
            const { presets } = usePresetStoreBase.getState();
            const id = presets[0].id;

            usePresetStoreBase.getState().deletePreset(id);

            expect(usePresetStoreBase.getState().presets).toHaveLength(0);
        });

        it('removes only the targeted preset when multiple exist', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'First');
            usePresetStoreBase.getState().savePreset(baseConfig, 'Second');
            const { presets } = usePresetStoreBase.getState();
            const idToDelete = presets[0].id;

            usePresetStoreBase.getState().deletePreset(idToDelete);

            const remaining = usePresetStoreBase.getState().presets;
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).not.toBe(idToDelete);
        });

        it('persists deletion to storage', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'Stored');
            const id = usePresetStoreBase.getState().presets[0].id;

            usePresetStoreBase.getState().deletePreset(id);

            expect(storageService.getPresets()).toHaveLength(0);
        });

        it('does nothing for unknown id', () => {
            usePresetStoreBase.getState().savePreset(baseConfig, 'Keep');
            expect(() => {
                usePresetStoreBase.getState().deletePreset('nonexistent');
            }).not.toThrow();
            expect(usePresetStoreBase.getState().presets).toHaveLength(1);
        });
    });

    describe('updateLastUsed', () => {
        it('updates lastUsedAt timestamp', () => {
            const oldTimestamp = '2026-01-01T00:00:00.000Z';
            const preset: SessionPreset = {
                id: 'p1',
                name: 'Test',
                config: baseConfig,
                createdAt: oldTimestamp,
                lastUsedAt: oldTimestamp
            };
            storageService.savePreset(preset);
            usePresetStoreBase.setState({ presets: [preset] });

            usePresetStoreBase.getState().updateLastUsed('p1');

            expect(usePresetStoreBase.getState().presets[0].lastUsedAt).not.toBe(oldTimestamp);
        });

        it('does nothing for unknown id', () => {
            usePresetStoreBase.setState({ presets: [] });
            expect(() => {
                usePresetStoreBase.getState().updateLastUsed('nonexistent');
            }).not.toThrow();
            expect(usePresetStoreBase.getState().presets).toHaveLength(0);
        });

        it('persists updated timestamp to storage', () => {
            const oldTimestamp = '2026-01-01T00:00:00.000Z';
            const preset: SessionPreset = {
                id: 'p2',
                name: 'Stored',
                config: baseConfig,
                createdAt: oldTimestamp,
                lastUsedAt: oldTimestamp
            };
            storageService.savePreset(preset);
            usePresetStoreBase.setState({ presets: [preset] });

            usePresetStoreBase.getState().updateLastUsed('p2');

            const fromStorage = storageService.getPresets();
            expect(fromStorage[0].lastUsedAt).not.toBe(oldTimestamp);
        });
    });
});
