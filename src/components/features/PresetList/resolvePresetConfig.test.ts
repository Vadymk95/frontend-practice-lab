import { describe, expect, it } from 'vitest';

import type { ManifestEntry } from '@/hooks/data/useCategories';
import type { SessionConfig } from '@/lib/storage/types';

import { resolvePresetConfig } from './resolvePresetConfig';

const entry = (slug: string, quizEasy: number): ManifestEntry => ({
    slug,
    displayName: slug,
    counts: {
        easy: quizEasy,
        medium: 0,
        hard: 0,
        total: quizEasy,
        quiz: quizEasy,
        bugFinding: 0,
        codeCompletion: 0
    },
    matrix: {
        easy: { quiz: quizEasy, bugFinding: 0, codeCompletion: 0 },
        medium: { quiz: 0, bugFinding: 0, codeCompletion: 0 },
        hard: { quiz: 0, bugFinding: 0, codeCompletion: 0 }
    }
});

const manifest = [entry('javascript', 5), entry('css', 2)];

const config: SessionConfig = {
    categories: ['javascript', 'retired-topic'],
    questionCount: 10,
    difficulty: 'all',
    mode: 'all',
    order: 'random'
};

describe('resolvePresetConfig', () => {
    it('drops categories the manifest no longer has', () => {
        expect(resolvePresetConfig(config, manifest)?.categories).toEqual(['javascript']);
    });

    it('clamps questionCount to what the surviving categories hold', () => {
        expect(resolvePresetConfig(config, manifest)?.questionCount).toBe(5);
    });

    it('keeps a questionCount that still fits', () => {
        const small = { ...config, questionCount: 3 };
        expect(resolvePresetConfig(small, manifest)?.questionCount).toBe(3);
    });

    it('returns null when no category of the preset exists any more', () => {
        const stale = { ...config, categories: ['retired-topic', 'also-gone'] };
        expect(resolvePresetConfig(stale, manifest)).toBeNull();
    });

    it('returns null when the surviving categories hold nothing for that mode', () => {
        const noBugs = { ...config, mode: 'bug-finding' as const };
        expect(resolvePresetConfig(noBugs, manifest)).toBeNull();
    });

    it('passes the config through untouched when the manifest is unavailable', () => {
        expect(resolvePresetConfig(config, [])).toEqual(config);
    });
});
