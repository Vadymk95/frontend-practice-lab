import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCategoryQuestions } from '@/hooks/data/useCategoryQuestions';
import { sampleWeighted } from '@/lib/algorithm';
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

export function useSessionSetup() {
    const navigate = useNavigate();
    const config = useSessionStore.use.config();
    const setQuestionList = useSessionStore.use.setQuestionList();
    const questionList = useSessionStore.use.questionList();
    const weights = useProgressStore.use.weights();

    useEffect(() => {
        if (!config) {
            navigate(RoutesPath.Root, { replace: true });
        }
    }, [config, navigate]);

    const categories = config?.categories ?? [];
    const { data: allQuestions, isLoading, isError, refetch } = useCategoryQuestions(categories);

    useEffect(() => {
        if (!config || isLoading || isError || allQuestions.length === 0) return;
        if (questionList.length > 0) return; // already sampled for this session

        const filtered = filterQuestions(allQuestions, config);
        const sampled = sampleWeighted(filtered, weights, config.questionCount);
        const ordered = config.order === 'sequential' ? sortByDifficulty(sampled) : sampled;

        setQuestionList(ordered);
    }, [config, isLoading, isError, allQuestions, weights, setQuestionList, questionList.length]);

    return { isLoading, isError, refetch };
}
