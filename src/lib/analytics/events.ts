import type { QuestionType } from '@/lib/data/schema';

export const ANALYTICS_EVENTS = {
    SESSION_START: 'session_start',
    QUESTION_ANSWERED: 'question_answered',
    SESSION_COMPLETE: 'session_complete',
    SESSION_ABANDONED: 'session_abandoned',
    REPEAT_MISTAKES_START: 'repeat_mistakes_start',
    PRESET_SAVED: 'preset_saved',
    PRESET_LOADED: 'preset_loaded',
    LANGUAGE_CHANGED: 'language_changed',
    THEME_CHANGED: 'theme_changed',
    PWA_INSTALL_PROMPT: 'pwa_install_prompt',
    PWA_UPDATE_APPLIED: 'pwa_update_applied'
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsEventPayloads {
    session_start: { categories: string[]; difficulty: string; mode: string; count: number };
    question_answered: {
        category: string;
        difficulty: string;
        type: QuestionType;
        correct: boolean;
        timeMs: number;
    };
    session_complete: {
        score: number;
        total: number;
        durationMs: number;
        weakCategories: string[];
    };
    session_abandoned: { answered: number; total: number };
    repeat_mistakes_start: { count: number };
    preset_saved: Record<string, never>;
    preset_loaded: Record<string, never>;
    language_changed: { to: 'ru' | 'en' };
    theme_changed: { to: 'dark' | 'light' };
    pwa_install_prompt: Record<string, never>;
    pwa_update_applied: Record<string, never>;
}
