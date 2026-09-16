import type { Question } from '@/lib/data/schema';

import { ALGORITHM_CONFIG } from './config';

/**
 * Weight a question is sampled with. A stored weight is the question's own history; a question
 * that has never been answered inherits a prior from its category error rate, so a weak topic
 * surfaces its unseen questions instead of only the ones already answered wrong.
 */
function resolveWeight(
    question: Question,
    weights: Record<string, number>,
    errorRates: Record<string, number>
): number {
    const stored = weights[question.id];
    if (stored !== undefined) return Math.max(stored, ALGORITHM_CONFIG.MIN_WEIGHT);

    const categoryRate = errorRates[question.category];
    if (categoryRate === undefined) return ALGORITHM_CONFIG.DEFAULT_WEIGHT;
    return calculateWeight(categoryRate, ALGORITHM_CONFIG.DEFAULT_WEIGHT);
}

/**
 * Weighted sampling without replacement. Never short-circuits to a plain shuffle: the
 * configurator defaults to "all available", so `count >= questions.length` is the common case
 * and the whole pool still has to come out weight-ordered for the adaptive order to be visible.
 */
export function sampleWeighted(
    questions: Question[],
    weights: Record<string, number>,
    count: number,
    errorRates: Record<string, number> = {}
): Question[] {
    if (questions.length === 0 || count <= 0) return [];

    const pool = questions.map((q) => ({ q, w: resolveWeight(q, weights, errorRates) }));
    const result: Question[] = [];
    const take = Math.min(count, pool.length);

    for (let i = 0; i < take; i++) {
        const total = pool.reduce((s, item) => s + item.w, 0);
        let r = Math.random() * total;
        let idx = pool.length - 1;

        for (let j = 0; j < pool.length; j++) {
            r -= pool[j]!.w;
            if (r <= 0) {
                idx = j;
                break;
            }
        }

        result.push(pool[idx]!.q);
        pool.splice(idx, 1);
    }

    return result;
}

/**
 * Category-level weight step. Used as the PRIOR for questions with no history of their own —
 * not to move a question's stored weight (see `nextQuestionWeight`).
 */
export function calculateWeight(errorRate: number, currentWeight: number): number {
    if (!isFinite(errorRate) || !isFinite(currentWeight) || currentWeight < 0)
        return ALGORITHM_CONFIG.DEFAULT_WEIGHT;
    if (errorRate > ALGORITHM_CONFIG.HIGH_ERROR_THRESHOLD) {
        return Math.min(
            currentWeight * ALGORITHM_CONFIG.HIGH_ERROR_MULTIPLIER,
            ALGORITHM_CONFIG.MAX_WEIGHT
        );
    }
    if (errorRate < ALGORITHM_CONFIG.LOW_ERROR_THRESHOLD) {
        return Math.max(
            currentWeight * ALGORITHM_CONFIG.LOW_ERROR_MULTIPLIER,
            ALGORITHM_CONFIG.MIN_WEIGHT
        );
    }
    return currentWeight;
}

/**
 * Moves a question's own weight by its own outcome — wrong raises it, correct lowers it.
 * Deriving it from the category error rate instead makes a correct answer in a weak category
 * raise the weight of the question just answered right.
 */
export function nextQuestionWeight(currentWeight: number, correct: boolean): number {
    if (!isFinite(currentWeight) || currentWeight < 0) return ALGORITHM_CONFIG.DEFAULT_WEIGHT;
    return correct
        ? Math.max(
              currentWeight * ALGORITHM_CONFIG.LOW_ERROR_MULTIPLIER,
              ALGORITHM_CONFIG.MIN_WEIGHT
          )
        : Math.min(
              currentWeight * ALGORITHM_CONFIG.HIGH_ERROR_MULTIPLIER,
              ALGORITHM_CONFIG.MAX_WEIGHT
          );
}

export function updateErrorRate(previous: number, correct: boolean): number {
    if (!isFinite(previous)) return correct ? 0 : 1;
    const decay = ALGORITHM_CONFIG.ERROR_RATE_DECAY;
    const updated = correct ? previous * (1 - decay) : previous * (1 - decay) + decay;
    return Math.max(0, Math.min(1, updated));
}
