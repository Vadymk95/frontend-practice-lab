import type { SessionPreset, StorageService, StreakData } from './types';

const STORAGE_KEYS = {
    WEIGHTS: 'ios_weights',
    ERROR_RATES: 'ios_error_rates',
    STREAK: 'ios_streak',
    RECORDS: 'ios_records',
    THEME: 'ios_theme',
    LANGUAGE: 'ios_language',
    PRESETS: 'ios_presets'
} as const;

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
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
        return readJson<Record<string, number>>(STORAGE_KEYS.WEIGHTS, {});
    }

    setWeights(weights: Record<string, number>): void {
        writeJson(STORAGE_KEYS.WEIGHTS, weights);
    }

    getErrorRates(): Record<string, number> {
        return readJson<Record<string, number>>(STORAGE_KEYS.ERROR_RATES, {});
    }

    setErrorRates(rates: Record<string, number>): void {
        writeJson(STORAGE_KEYS.ERROR_RATES, rates);
    }

    getStreak(): StreakData {
        return readJson<StreakData>(STORAGE_KEYS.STREAK, { current: 0, lastActivityDate: '' });
    }

    setStreak(data: StreakData): void {
        writeJson(STORAGE_KEYS.STREAK, data);
    }

    getRecords(): Record<string, number> {
        return readJson<Record<string, number>>(STORAGE_KEYS.RECORDS, {});
    }

    setRecord(key: string, ms: number): void {
        const records = this.getRecords();
        records[key] = ms;
        writeJson(STORAGE_KEYS.RECORDS, records);
    }

    getTheme(): 'dark' | 'light' {
        const stored = readJson<string>(STORAGE_KEYS.THEME, 'dark');
        return stored === 'light' ? 'light' : 'dark';
    }

    setTheme(t: 'dark' | 'light'): void {
        writeJson(STORAGE_KEYS.THEME, t);
    }

    getLanguage(): 'ru' | 'en' {
        const stored = readJson<string>(STORAGE_KEYS.LANGUAGE, 'ru');
        return stored === 'en' ? 'en' : 'ru';
    }

    setLanguage(l: 'ru' | 'en'): void {
        writeJson(STORAGE_KEYS.LANGUAGE, l);
    }

    getPresets(): SessionPreset[] {
        return readJson<SessionPreset[]>(STORAGE_KEYS.PRESETS, []);
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
}

export { LocalStorageService };
