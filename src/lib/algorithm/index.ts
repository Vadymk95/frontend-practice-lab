import type { Question } from '@/lib/data/schema';

import { ALGORITHM_CONFIG } from './config';

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i];
        a[i] = a[j]!;
        a[j] = tmp!;
    }
    return a;
}

function resolveWeight(question: Question, weights: Record<string, number>): number {
    const w = weights[question.id] ?? ALGORITHM_CONFIG.DEFAULT_WEIGHT;
    return Math.max(w, ALGORITHM_CONFIG.MIN_WEIGHT);
}

export function sampleWeighted(
    questions: Question[],
    weights: Record<string, number>,
    count: number
): Question[] {
    if (questions.length === 0 || count <= 0) return [];
    if (count >= questions.length) return shuffle(questions);

    const pool = questions.map((q) => ({ q, w: resolveWeight(q, weights) }));
    const result: Question[] = [];

    for (let i = 0; i < count; i++) {
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

// Stubs — full adaptive logic deferred to Story 4.x
export function calculateWeight(_errorRate: number, currentWeight: number): number {
    return currentWeight;
}

export function updateErrorRate(previous: number, _correct: boolean): number {
    return previous;
}
