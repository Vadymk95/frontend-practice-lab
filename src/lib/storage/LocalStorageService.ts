import type { z } from 'zod';

import {
    ErrorRatesSchema,
    LanguageSchema,
    LastSessionResultsSchema,
    PresetsSchema,
    RecordsSchema,
    StreakSchema,
    ThemeSchema,
    WeightsSchema
} from './schemas';
import type { SessionPreset, StorageService, StreakData } from './types';

const STORAGE_KEYS = {
    WEIGHTS: 'ios_weights',
    ERROR_RATES: 'ios_error_rates',
    STREAK: 'ios_streak',
    RECORDS: 'ios_records',
    THEME: 'ios_theme',
    LANGUAGE: 'ios_language',
    PRESETS: 'ios_presets',
    LAST_SESSION_RESULTS: 'ios_last_session_results'
} as const;

function readJson<T>(key: string, fallback: T, schema: z.ZodType<T>): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const result = schema.safeParse(JSON.parse(raw));
        return result.success ? result.data : fallback;
    } catch {
        return fallback;
    }
}

function writeJson<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage unavailable (private browsing, quota exceeded)
    }
}

class LocalStorageService implements StorageService {
    getWeights(): Record<string, number> {
        return readJson(STORAGE_KEYS.WEIGHTS, {}, WeightsSchema);
    }

    setWeights(weights: Record<string, number>): void {
        writeJson(STORAGE_KEYS.WEIGHTS, weights);
    }

    getErrorRates(): Record<string, number> {
        return readJson(STORAGE_KEYS.ERROR_RATES, {}, ErrorRatesSchema);
    }

    setErrorRates(rates: Record<string, number>): void {
        writeJson(STORAGE_KEYS.ERROR_RATES, rates);
    }

    getStreak(): StreakData {
        return readJson(STORAGE_KEYS.STREAK, { current: 0, lastActivityDate: '' }, StreakSchema);
    }

    setStreak(data: StreakData): void {
        writeJson(STORAGE_KEYS.STREAK, data);
    }

    getRecords(): Record<string, number> {
        return readJson(STORAGE_KEYS.RECORDS, {}, RecordsSchema);
    }

    setRecord(key: string, ms: number): void {
        const records = this.getRecords();
        records[key] = ms;
        writeJson(STORAGE_KEYS.RECORDS, records);
    }

    getTheme(): 'dark' | 'light' {
        return readJson(STORAGE_KEYS.THEME, 'dark', ThemeSchema);
    }

    setTheme(t: 'dark' | 'light'): void {
        writeJson(STORAGE_KEYS.THEME, t);
    }

    getLanguage(): 'ru' | 'en' {
        return readJson(STORAGE_KEYS.LANGUAGE, 'ru', LanguageSchema);
    }

    setLanguage(l: 'ru' | 'en'): void {
        writeJson(STORAGE_KEYS.LANGUAGE, l);
    }

    getPresets(): SessionPreset[] {
        return readJson(STORAGE_KEYS.PRESETS, [], PresetsSchema);
    }

    savePreset(p: SessionPreset): void {
        const presets = this.getPresets();
        const idx = presets.findIndex((pr) => pr.id === p.id);
        if (idx >= 0) {
            presets[idx] = p;
        } else {
            presets.push(p);
        }
        writeJson(STORAGE_KEYS.PRESETS, presets);
    }

    deletePreset(id: string): void {
        const presets = this.getPresets().filter((p) => p.id !== id);
        writeJson(STORAGE_KEYS.PRESETS, presets);
    }

    getLastSessionResults(): Record<string, boolean> {
        return readJson(STORAGE_KEYS.LAST_SESSION_RESULTS, {}, LastSessionResultsSchema);
    }

    setLastSessionResults(results: Record<string, boolean>): void {
        writeJson(STORAGE_KEYS.LAST_SESSION_RESULTS, results);
    }
}

export { LocalStorageService };
