import { describe, expect, it } from 'vitest';

import { ALGORITHM_CONFIG } from './config';
import { calculateWeight, sampleWeighted, updateErrorRate } from './index';
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

describe('calculateWeight', () => {
    it('high error (>0.40): weight increases', () => {
        const result = calculateWeight(0.5, 1.0);
        expect(result).toBe(2.0); // 1.0 * HIGH_ERROR_MULTIPLIER (2.0)
    });

    it('high error: weight capped at MAX_WEIGHT', () => {
        const result = calculateWeight(0.5, 8.0);
        expect(result).toBe(ALGORITHM_CONFIG.MAX_WEIGHT); // 8.0 * 2.0 = 16 → capped at 10
    });

    it('low error (<0.15): weight decreases', () => {
        const result = calculateWeight(0.1, 2.0);
        expect(result).toBe(1.0); // 2.0 * LOW_ERROR_MULTIPLIER (0.5)
    });

    it('low error: weight floored at MIN_WEIGHT', () => {
        const result = calculateWeight(0.1, 0.6);
        expect(result).toBe(ALGORITHM_CONFIG.MIN_WEIGHT); // 0.6 * 0.5 = 0.3 → floored at 0.5
    });

    it('mid error (between thresholds): weight unchanged', () => {
        const result = calculateWeight(0.25, 3.0);
        expect(result).toBe(3.0);
    });

    it('exactly at HIGH_ERROR_THRESHOLD (0.40): weight unchanged', () => {
        const result = calculateWeight(0.4, 3.0);
        expect(result).toBe(3.0); // boundary is exclusive
    });

    it('exactly at LOW_ERROR_THRESHOLD (0.15): weight unchanged', () => {
        const result = calculateWeight(0.15, 3.0);
        expect(result).toBe(3.0); // boundary is exclusive
    });

    it('NaN errorRate: returns DEFAULT_WEIGHT', () => {
        const result = calculateWeight(NaN, 3.0);
        expect(result).toBe(ALGORITHM_CONFIG.DEFAULT_WEIGHT);
    });

    it('Infinity errorRate: returns DEFAULT_WEIGHT', () => {
        const result = calculateWeight(Infinity, 3.0);
        expect(result).toBe(ALGORITHM_CONFIG.DEFAULT_WEIGHT);
    });

    it('NaN currentWeight: returns DEFAULT_WEIGHT', () => {
        const result = calculateWeight(0.5, NaN);
        expect(result).toBe(ALGORITHM_CONFIG.DEFAULT_WEIGHT);
    });

    it('negative currentWeight: returns DEFAULT_WEIGHT', () => {
        const result = calculateWeight(0.5, -1);
        expect(result).toBe(ALGORITHM_CONFIG.DEFAULT_WEIGHT);
    });

    it('MAX_WEIGHT at high error: stays at MAX_WEIGHT', () => {
        const result = calculateWeight(0.5, ALGORITHM_CONFIG.MAX_WEIGHT);
        expect(result).toBe(ALGORITHM_CONFIG.MAX_WEIGHT);
    });

    it('MIN_WEIGHT at low error: stays at MIN_WEIGHT', () => {
        const result = calculateWeight(0.1, ALGORITHM_CONFIG.MIN_WEIGHT);
        expect(result).toBe(ALGORITHM_CONFIG.MIN_WEIGHT);
    });
});

describe('updateErrorRate', () => {
    it('correct=true: rate decreases from 0.5 toward 0', () => {
        const result = updateErrorRate(0.5, true);
        expect(result).toBeLessThan(0.5);
        expect(result).toBe(0.4); // 0.5 * (1 - 0.2)
    });

    it('correct=false: rate increases from 0.5 toward 1', () => {
        const result = updateErrorRate(0.5, false);
        expect(result).toBeGreaterThan(0.5);
        expect(result).toBeCloseTo(0.6, 10); // 0.5 * (1 - 0.2) + 0.2
    });

    it('correct=true from 0.0: stays at 0.0 (clamp)', () => {
        const result = updateErrorRate(0.0, true);
        expect(result).toBe(0.0);
    });

    it('correct=false from 1.0: stays at 1.0 (clamp)', () => {
        const result = updateErrorRate(1.0, false);
        expect(result).toBe(1.0);
    });

    it('result always in [0, 1]', () => {
        for (let i = 0; i <= 10; i++) {
            const rate = i / 10;
            expect(updateErrorRate(rate, true)).toBeGreaterThanOrEqual(0);
            expect(updateErrorRate(rate, true)).toBeLessThanOrEqual(1);
            expect(updateErrorRate(rate, false)).toBeGreaterThanOrEqual(0);
            expect(updateErrorRate(rate, false)).toBeLessThanOrEqual(1);
        }
    });

    it('NaN previous with correct=true: returns 0', () => {
        expect(updateErrorRate(NaN, true)).toBe(0);
    });

    it('NaN previous with correct=false: returns 1', () => {
        expect(updateErrorRate(NaN, false)).toBe(1);
    });
});
