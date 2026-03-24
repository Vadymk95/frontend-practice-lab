import { describe, expect, it } from 'vitest';

import { ALGORITHM_CONFIG } from './config';
import { sampleWeighted } from './index';
import type { Question } from '../data/schema';

function makeQuestion(id: string): Question {
    return {
        id,
        type: 'single-choice',
        category: 'javascript',
        difficulty: 'easy',
        tags: [],
        question: `Question ${id}`,
        options: ['A', 'B', 'C', 'D'],
        correct: 0,
        explanation: 'Explanation'
    };
}

const POOL_SIZE = 10;
const pool = Array.from({ length: POOL_SIZE }, (_, i) => makeQuestion(`q${i}`));
const emptyWeights: Record<string, number> = {};

describe('sampleWeighted', () => {
    it('returns exactly count items when pool is large enough', () => {
        const result = sampleWeighted(pool, emptyWeights, 5);
        expect(result).toHaveLength(5);
    });

    it('returns unique questions (no duplicates)', () => {
        const result = sampleWeighted(pool, emptyWeights, 7);
        const ids = result.map((q) => q.id);
        expect(new Set(ids).size).toBe(7);
    });

    it('returns all items when count >= pool.length', () => {
        const result = sampleWeighted(pool, emptyWeights, POOL_SIZE + 5);
        expect(result).toHaveLength(POOL_SIZE);
        const ids = new Set(result.map((q) => q.id));
        pool.forEach((q) => expect(ids.has(q.id)).toBe(true));
    });

    it('returns full pool when count equals pool.length', () => {
        const result = sampleWeighted(pool, emptyWeights, POOL_SIZE);
        expect(result).toHaveLength(POOL_SIZE);
    });

    it('handles empty pool gracefully', () => {
        const result = sampleWeighted([], emptyWeights, 5);
        expect(result).toHaveLength(0);
    });

    it('handles count of 0', () => {
        const result = sampleWeighted(pool, emptyWeights, 0);
        expect(result).toHaveLength(0);
    });

    it('no question excluded at MIN_WEIGHT — all questions remain eligible', () => {
        const minWeights: Record<string, number> = {};
        pool.forEach((q) => {
            minWeights[q.id] = ALGORITHM_CONFIG.MIN_WEIGHT;
        });

        const seen = new Set<string>();
        for (let i = 0; i < 200; i++) {
            sampleWeighted(pool, minWeights, 1).forEach((q) => seen.add(q.id));
        }
        // All 10 questions should appear at some point across 200 samples
        expect(seen.size).toBe(POOL_SIZE);
    });

    it('equal weights produce uniform-ish distribution', () => {
        const counts: Record<string, number> = {};
        pool.forEach((q) => {
            counts[q.id] = 0;
        });

        const TRIALS = 2000;
        for (let i = 0; i < TRIALS; i++) {
            const result = sampleWeighted(pool, emptyWeights, 1);
            result.forEach((q) => {
                counts[q.id]++;
            });
        }

        const avg = TRIALS / POOL_SIZE;
        Object.values(counts).forEach((count) => {
            // Each question should appear within ±50% of expected frequency
            expect(count).toBeGreaterThan(avg * 0.5);
            expect(count).toBeLessThan(avg * 1.5);
        });
    });

    it('uses DEFAULT_WEIGHT for questions without stored weight', () => {
        const weights: Record<string, number> = { q0: ALGORITHM_CONFIG.MAX_WEIGHT };
        const counts: Record<string, number> = { q0: 0, q1: 0 };
        const twoPool = [makeQuestion('q0'), makeQuestion('q1')];

        for (let i = 0; i < 1000; i++) {
            const result = sampleWeighted(twoPool, weights, 1);
            counts[result[0].id]++;
        }
        // q0 has MAX_WEIGHT (10), q1 has DEFAULT_WEIGHT (1.0)
        // q0 should be picked ~10x more often
        expect(counts['q0']).toBeGreaterThan(counts['q1'] * 5);
    });
});
