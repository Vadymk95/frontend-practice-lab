import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalStorageService } from './LocalStorageService';
import type { SessionPreset, StreakData } from './types';

const KEYS = {
    WEIGHTS: 'ios_weights',
    ERROR_RATES: 'ios_error_rates',
    STREAK: 'ios_streak',
    RECORDS: 'ios_records',
    THEME: 'ios_theme',
    LANGUAGE: 'ios_language',
    PRESETS: 'ios_presets',
    LAST_SESSION_RESULTS: 'ios_last_session_results'
} as const;

describe('LocalStorageService', () => {
    let service: LocalStorageService;

    beforeEach(() => {
        localStorage.clear();
        service = new LocalStorageService();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('weights', () => {
        it('returns empty object when unset', () => {
            expect(service.getWeights()).toEqual({});
        });

        it('round-trips through JSON', () => {
            service.setWeights({ js: 0.7, ts: 0.3 });
            expect(service.getWeights()).toEqual({ js: 0.7, ts: 0.3 });
            expect(localStorage.getItem(KEYS.WEIGHTS)).toBe('{"js":0.7,"ts":0.3}');
        });

        it('falls back to {} on corrupted JSON', () => {
            localStorage.setItem(KEYS.WEIGHTS, '{not valid');
            expect(service.getWeights()).toEqual({});
        });
    });

    describe('error rates', () => {
        it('returns empty object when unset', () => {
            expect(service.getErrorRates()).toEqual({});
        });

        it('round-trips through JSON', () => {
            service.setErrorRates({ react: 0.4 });
            expect(service.getErrorRates()).toEqual({ react: 0.4 });
        });

        it('falls back to {} on corrupted JSON', () => {
            localStorage.setItem(KEYS.ERROR_RATES, 'garbage');
            expect(service.getErrorRates()).toEqual({});
        });
    });

    describe('streak', () => {
        it('returns default streak when unset', () => {
            expect(service.getStreak()).toEqual({ current: 0, lastActivityDate: '' });
        });

        it('round-trips StreakData', () => {
            const data: StreakData = { current: 5, lastActivityDate: '2026-04-21' };
            service.setStreak(data);
            expect(service.getStreak()).toEqual(data);
        });

        it('falls back to default on corrupted JSON', () => {
            localStorage.setItem(KEYS.STREAK, '{{');
            expect(service.getStreak()).toEqual({ current: 0, lastActivityDate: '' });
        });
    });

    describe('records', () => {
        it('returns empty object when unset', () => {
            expect(service.getRecords()).toEqual({});
        });

        it('setRecord merges into existing records', () => {
            service.setRecord('cat-a', 1200);
            service.setRecord('cat-b', 900);
            expect(service.getRecords()).toEqual({ 'cat-a': 1200, 'cat-b': 900 });
        });

        it('setRecord overwrites existing key', () => {
            service.setRecord('cat-a', 1200);
            service.setRecord('cat-a', 800);
            expect(service.getRecords()).toEqual({ 'cat-a': 800 });
        });
    });

    describe('theme', () => {
        it('defaults to dark when unset', () => {
            expect(service.getTheme()).toBe('dark');
        });

        it('round-trips "light"', () => {
            service.setTheme('light');
            expect(service.getTheme()).toBe('light');
        });

        it('round-trips "dark"', () => {
            service.setTheme('dark');
            expect(service.getTheme()).toBe('dark');
        });

        it('coerces unexpected stored value to "dark"', () => {
            localStorage.setItem(KEYS.THEME, '"solarized"');
            expect(service.getTheme()).toBe('dark');
        });

        it('falls back to "dark" on corrupted JSON', () => {
            localStorage.setItem(KEYS.THEME, 'not json');
            expect(service.getTheme()).toBe('dark');
        });
    });

    describe('language', () => {
        it('defaults to ru when unset', () => {
            expect(service.getLanguage()).toBe('ru');
        });

        it('round-trips "en"', () => {
            service.setLanguage('en');
            expect(service.getLanguage()).toBe('en');
        });

        it('coerces unexpected stored value to "ru"', () => {
            localStorage.setItem(KEYS.LANGUAGE, '"fr"');
            expect(service.getLanguage()).toBe('ru');
        });
    });

    describe('presets', () => {
        const makePreset = (id: string, name = id): SessionPreset => ({
            id,
            name,
            config: {
                categories: ['react'],
                questionCount: 10,
                difficulty: 'medium',
                mode: 'quiz',
                order: 'random'
            },
            createdAt: '2026-04-21T00:00:00.000Z',
            lastUsedAt: '2026-04-21T00:00:00.000Z'
        });

        it('returns empty array when unset', () => {
            expect(service.getPresets()).toEqual([]);
        });

        it('savePreset appends new preset', () => {
            service.savePreset(makePreset('p1'));
            service.savePreset(makePreset('p2'));
            expect(service.getPresets().map((p) => p.id)).toEqual(['p1', 'p2']);
        });

        it('savePreset replaces existing preset by id', () => {
            service.savePreset(makePreset('p1', 'original'));
            service.savePreset(makePreset('p1', 'updated'));
            const presets = service.getPresets();
            expect(presets).toHaveLength(1);
            expect(presets[0].name).toBe('updated');
        });

        it('deletePreset removes by id', () => {
            service.savePreset(makePreset('p1'));
            service.savePreset(makePreset('p2'));
            service.deletePreset('p1');
            expect(service.getPresets().map((p) => p.id)).toEqual(['p2']);
        });

        it('deletePreset is a no-op when id missing', () => {
            service.savePreset(makePreset('p1'));
            service.deletePreset('nope');
            expect(service.getPresets()).toHaveLength(1);
        });
    });

    describe('last session results', () => {
        it('returns empty object when unset', () => {
            expect(service.getLastSessionResults()).toEqual({});
        });

        it('round-trips results', () => {
            service.setLastSessionResults({ 'q-1': true, 'q-2': false });
            expect(service.getLastSessionResults()).toEqual({ 'q-1': true, 'q-2': false });
        });
    });

    describe('quota / write failures', () => {
        it('swallows setItem exceptions silently', () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new DOMException('quota', 'QuotaExceededError');
            });
            expect(() => service.setWeights({ js: 1 })).not.toThrow();
            expect(spy).toHaveBeenCalled();
        });

        it('swallows getItem exceptions and returns fallback', () => {
            vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('storage disabled');
            });
            expect(service.getWeights()).toEqual({});
            expect(service.getTheme()).toBe('dark');
        });
    });
});
