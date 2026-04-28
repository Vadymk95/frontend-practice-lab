import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FlashState } from '@/components/common/FlashBanner';
import { useCategoryQuestions } from '@/hooks/data/useCategoryQuestions';
import { sampleWeighted } from '@/lib/algorithm';
import { track } from '@/lib/analytics';
import type { Question } from '@/lib/data/schema';
import type { SessionConfig } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { useProgressStore } from '@/store/progress';
import { useSessionStore } from '@/store/session';

export function filterQuestions(questions: Question[], config: SessionConfig): Question[] {
    return questions.filter((q) => {
        const difficultyMatch = config.difficulty === 'all' || q.difficulty === config.difficulty;
        const modeMatch =
            config.mode === 'all' ||
            (config.mode === 'quiz' && (q.type === 'single-choice' || q.type === 'multi-choice')) ||
            (config.mode === 'bug-finding' && q.type === 'bug-finding') ||
            (config.mode === 'code-completion' && q.type === 'code-completion');
        return difficultyMatch && modeMatch;
    });
}

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

export function sortByDifficulty(questions: Question[]): Question[] {
    return [...questions].sort(
        (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
    );
}

export function sampleWithCategoryGuarantee(
    questions: Question[],
    weights: Record<string, number>,
    count: number,
    categories: string[]
): Question[] {
    if (count <= 0) return [];
    if (count >= questions.length) return sampleWeighted(questions, weights, count);

    const seeded: Question[] = [];
    const remaining = [...questions];

    for (const cat of categories) {
        const catPool = remaining.filter((q) => q.category === cat);
        if (catPool.length === 0) continue;
        const picked = sampleWeighted(catPool, weights, 1)[0];
        if (picked) {
            seeded.push(picked);
            const idx = remaining.findIndex((q) => q.id === picked.id);
            if (idx !== -1) remaining.splice(idx, 1);
        }
        if (seeded.length >= count) break;
    }

    const fillCount = Math.max(0, count - seeded.length);
    const filled = fillCount > 0 ? sampleWeighted(remaining, weights, fillCount) : [];
    const combined = [...seeded, ...filled];
    return sampleWeighted(combined, weights, combined.length); // count === length → shuffle path
}

export function useSessionSetup() {
    const navigate = useNavigate();
    const config = useSessionStore.use.config();
    const setQuestionList = useSessionStore.use.setQuestionList();
    const questionList = useSessionStore.use.questionList();
    const weights = useProgressStore.use.weights();

    useEffect(() => {
        if (!config) {
            // If the user just hit End Session, the play page already navigated home
            // with a sessionEnded flash — skip our redirect so we don't overwrite it.
            if (useSessionStore.getState().endedAt !== null) return;
            const state: FlashState = { flash: 'noActiveSession' };
            navigate(RoutesPath.Root, { replace: true, state });
        }
    }, [config, navigate]);

    const categories = config?.categories ?? [];
    const { data: allQuestions, isLoading, isError, refetch } = useCategoryQuestions(categories);

    useEffect(() => {
        if (!config || isLoading || isError || allQuestions.length === 0) return;
        if (questionList.length > 0) return; // already sampled for this session

        const filtered = filterQuestions(allQuestions, config);
        const sampled = sampleWithCategoryGuarantee(
            filtered,
            weights,
            config.questionCount,
            config.categories
        );
        const ordered = config.order === 'sequential' ? sortByDifficulty(sampled) : sampled;

        setQuestionList(ordered);
        track('session_start', {
            categories: config.categories,
            difficulty: config.difficulty,
            mode: config.mode,
            count: ordered.length
        });
    }, [config, isLoading, isError, allQuestions, weights, setQuestionList, questionList.length]);

    return { isLoading, isError, refetch };
}
