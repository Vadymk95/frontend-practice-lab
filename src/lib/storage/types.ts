export interface SessionConfig {
    categorySlug: string;
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    timeLimit?: number; // seconds; undefined = no limit
}

export interface StreakData {
    current: number;
    lastActivityDate: string; // ISO date string, e.g. "2026-03-24"
}

export interface SessionPreset {
    id: string;
    name: string;
    config: SessionConfig;
    createdAt: string;
    lastUsedAt: string;
}

export interface StorageService {
    // Progress
    getWeights(): Record<string, number>;
    setWeights(weights: Record<string, number>): void;
    getErrorRates(): Record<string, number>;
    setErrorRates(rates: Record<string, number>): void;
    getStreak(): StreakData;
    setStreak(data: StreakData): void;
    getRecords(): Record<string, number>;
    setRecord(key: string, ms: number): void;
    // UI
    getTheme(): 'dark' | 'light';
    setTheme(t: 'dark' | 'light'): void;
    getLanguage(): 'ru' | 'en';
    setLanguage(l: 'ru' | 'en'): void;
    // Presets
    getPresets(): SessionPreset[];
    savePreset(p: SessionPreset): void;
    deletePreset(id: string): void;
}
