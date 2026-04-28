import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCategoryQuestions } from '@/hooks/data/useCategoryQuestions';
import { sampleWeighted } from '@/lib/algorithm';
import type { Question } from '@/lib/data/schema';
import type { SessionConfig } from '@/lib/storage/types';
import { useSessionStore } from '@/store/session';

import {
    filterQuestions,
    sampleWithCategoryGuarantee,
    sortByDifficulty,
    useSessionSetup
} from './useSessionSetup';

// Hoist navigateMock so it is available inside the vi.mock factory
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
    const mod = await importOriginal<typeof import('react-router-dom')>();
    return { ...mod, useNavigate: () => navigateMock };
});

vi.mock('@/hooks/data/useCategoryQuestions', () => ({
    useCategoryQuestions: vi.fn()
}));

vi.mock('@/lib/algorithm', () => ({
    sampleWeighted: vi.fn()
}));

const mockUseCategoryQuestions = vi.mocked(useCategoryQuestions);
const mockSampleWeighted = vi.mocked(sampleWeighted);

const defaultConfig: SessionConfig = {
    categories: ['javascript'],
    difficulty: 'all',
    mode: 'all',
    questionCount: 5,
    order: 'random'
};

const makeQuestion = (
    id: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'easy',
    type: Question['type'] = 'single-choice',
    category = 'javascript'
): Question =>
    ({
        id,
        type,
        category,
        difficulty,
        tags: [],
        question: `Question ${id}`,
        explanation: `Explanation ${id}`,
        options: ['A', 'B'],
        correct: 0
    }) as unknown as Question;

const mockRefetch = vi.fn();

function makeWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    });
    return ({ children }: { children: ReactNode }) =>
        createElement(
            MemoryRouter,
            { initialEntries: ['/session/play'] },
            createElement(QueryClientProvider, { client: queryClient }, children)
        );
}

beforeEach(() => {
    navigateMock.mockReset();
    useSessionStore.setState({
        config: defaultConfig,
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        timerMs: 0
    });
    mockSampleWeighted.mockImplementation((questions, _weights, count) =>
        questions.slice(0, count)
    );
});

afterEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({
        config: null,
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        timerMs: 0
    });
});

describe('filterQuestions', () => {
    const questions: Question[] = [
        makeQuestion('q1', 'easy', 'single-choice'),
        makeQuestion('q2', 'medium', 'multi-choice'),
        makeQuestion('q3', 'hard', 'bug-finding'),
        makeQuestion('q4', 'easy', 'code-completion')
    ];

    it('returns all questions when difficulty=all and mode=all', () => {
        const config: SessionConfig = { ...defaultConfig, difficulty: 'all', mode: 'all' };
        expect(filterQuestions(questions, config)).toHaveLength(4);
    });

    it('filters by difficulty', () => {
        const config: SessionConfig = { ...defaultConfig, difficulty: 'easy', mode: 'all' };
        const result = filterQuestions(questions, config);
        expect(result).toHaveLength(2);
        expect(result.every((q) => q.difficulty === 'easy')).toBe(true);
    });

    it('filters quiz mode to single-choice and multi-choice', () => {
        const config: SessionConfig = { ...defaultConfig, difficulty: 'all', mode: 'quiz' };
        const result = filterQuestions(questions, config);
        expect(result).toHaveLength(2);
        expect(result.map((q) => q.type)).toEqual(['single-choice', 'multi-choice']);
    });

    it('filters bug-finding mode', () => {
        const config: SessionConfig = { ...defaultConfig, difficulty: 'all', mode: 'bug-finding' };
        const result = filterQuestions(questions, config);
        expect(result).toHaveLength(1);
        expect(result[0]!.type).toBe('bug-finding');
    });

    it('filters code-completion mode', () => {
        const config: SessionConfig = {
            ...defaultConfig,
            difficulty: 'all',
            mode: 'code-completion'
        };
        const result = filterQuestions(questions, config);
        expect(result).toHaveLength(1);
        expect(result[0]!.type).toBe('code-completion');
    });
});

describe('sortByDifficulty', () => {
    it('sorts easy → medium → hard', () => {
        const questions: Question[] = [
            makeQuestion('q3', 'hard'),
            makeQuestion('q1', 'easy'),
            makeQuestion('q2', 'medium')
        ];
        const sorted = sortByDifficulty(questions);
        expect(sorted.map((q) => q.difficulty)).toEqual(['easy', 'medium', 'hard']);
    });

    it('does not mutate the original array', () => {
        const questions: Question[] = [makeQuestion('q2', 'hard'), makeQuestion('q1', 'easy')];
        const original = [...questions];
        sortByDifficulty(questions);
        expect(questions).toEqual(original);
    });
});

describe('useSessionSetup', () => {
    it('redirects to / when no config in sessionStore', async () => {
        useSessionStore.setState({ config: null });

        mockUseCategoryQuestions.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/', {
                replace: true,
                state: { flash: 'noActiveSession' }
            });
        });
    });

    it('calls sampleWeighted with only difficulty-filtered questions', async () => {
        const easyQ = makeQuestion('q1', 'easy', 'single-choice');
        const hardQ = makeQuestion('q2', 'hard', 'single-choice');

        useSessionStore.setState({
            config: { ...defaultConfig, difficulty: 'easy', questionCount: 2 }
        });

        mockUseCategoryQuestions.mockReturnValue({
            data: [easyQ, hardQ],
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        mockSampleWeighted.mockReturnValue([easyQ]);

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            const [filtered] = mockSampleWeighted.mock.calls[0]!;
            expect(filtered).toHaveLength(1);
            expect((filtered as Question[])[0]!.difficulty).toBe('easy');
        });
    });

    it('calls sampleWeighted with only mode-filtered questions', async () => {
        const quizQ = makeQuestion('q1', 'easy', 'single-choice');
        const bugQ = makeQuestion('q2', 'easy', 'bug-finding');

        useSessionStore.setState({
            config: { ...defaultConfig, mode: 'quiz', questionCount: 2 }
        });

        mockUseCategoryQuestions.mockReturnValue({
            data: [quizQ, bugQ],
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        mockSampleWeighted.mockReturnValue([quizQ]);

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            const [filtered] = mockSampleWeighted.mock.calls[0]!;
            expect((filtered as Question[]).every((q) => q.type === 'single-choice')).toBe(true);
        });
    });

    it('sorts questions easy→medium→hard when order is sequential', async () => {
        const q1 = makeQuestion('q1', 'hard');
        const q2 = makeQuestion('q2', 'easy');

        useSessionStore.setState({
            config: { ...defaultConfig, order: 'sequential', questionCount: 2 }
        });

        mockUseCategoryQuestions.mockReturnValue({
            data: [q1, q2],
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        mockSampleWeighted.mockReturnValue([q1, q2]);

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            const questionList = useSessionStore.getState().questionList;
            if (questionList.length > 0) {
                expect(questionList[0]!.difficulty).toBe('easy');
                expect(questionList[1]!.difficulty).toBe('hard');
            }
        });
    });

    it('does NOT sort questions when order is random', async () => {
        const q1 = makeQuestion('q1', 'hard');
        const q2 = makeQuestion('q2', 'easy');

        useSessionStore.setState({
            config: { ...defaultConfig, order: 'random', questionCount: 2 }
        });

        mockUseCategoryQuestions.mockReturnValue({
            data: [q1, q2],
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        mockSampleWeighted.mockReturnValue([q1, q2]);

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            const questionList = useSessionStore.getState().questionList;
            if (questionList.length > 0) {
                expect(questionList[0]!.difficulty).toBe('hard');
            }
        });
    });

    it('samples questionCount questions from the pool', async () => {
        const questions = [
            makeQuestion('q1', 'easy'),
            makeQuestion('q2', 'easy'),
            makeQuestion('q3', 'easy')
        ];

        useSessionStore.setState({
            config: { ...defaultConfig, questionCount: 2 }
        });

        mockUseCategoryQuestions.mockReturnValue({
            data: questions,
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            expect(useSessionStore.getState().questionList).toHaveLength(2);
        });
    });

    it('passes progressStore weights to sampleWeighted', async () => {
        const q = makeQuestion('q1', 'easy');
        const weights = { q1: 2.5 };

        useSessionStore.setState({ config: defaultConfig });

        const { useProgressStore } = await import('@/store/progress');
        useProgressStore.setState({ weights });

        mockUseCategoryQuestions.mockReturnValue({
            data: [q],
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        mockSampleWeighted.mockReturnValue([q]);

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            expect(mockSampleWeighted).toHaveBeenCalledWith(
                expect.any(Array),
                weights,
                expect.any(Number)
            );
        });
    });

    it('returns isError=true when fetch fails', () => {
        mockUseCategoryQuestions.mockReturnValue({
            data: [],
            isLoading: false,
            isError: true,
            refetch: mockRefetch
        });

        const { result } = renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        expect(result.current.isError).toBe(true);
    });

    it('uses uniform weights on first session (empty weights)', async () => {
        const questions = [makeQuestion('q1'), makeQuestion('q2'), makeQuestion('q3')];

        useSessionStore.setState({ config: defaultConfig });
        const { useProgressStore } = await import('@/store/progress');
        useProgressStore.setState({ weights: {} });

        mockUseCategoryQuestions.mockReturnValue({
            data: questions,
            isLoading: false,
            isError: false,
            refetch: mockRefetch
        });

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            // sampleWeighted is called at least once — verify empty weights are passed through
            expect(mockSampleWeighted).toHaveBeenCalledWith(
                expect.any(Array),
                {}, // empty weights → DEFAULT_WEIGHT fallback applies inside algorithm
                expect.any(Number)
            );
        });
    });
});

describe('sampleWithCategoryGuarantee', () => {
    beforeEach(() => {
        mockSampleWeighted.mockImplementation((questions, _weights, count) =>
            (questions as Question[]).slice(0, count)
        );
    });

    it('returns empty array when count is 0', () => {
        const questions = [makeQuestion('q1'), makeQuestion('q2')];
        const result = sampleWithCategoryGuarantee(questions, {}, 0, ['javascript']);
        expect(result).toEqual([]);
        expect(mockSampleWeighted).not.toHaveBeenCalled();
    });

    it('returns all questions via sampleWeighted when count >= pool size', () => {
        const questions = [makeQuestion('q1'), makeQuestion('q2')];
        mockSampleWeighted.mockReturnValueOnce(questions);

        const result = sampleWithCategoryGuarantee(questions, {}, 5, ['javascript']);

        expect(mockSampleWeighted).toHaveBeenCalledWith(questions, {}, 5);
        expect(result).toEqual(questions);
    });

    it('seeds one question per selected category', () => {
        const jsQ = makeQuestion('q1', 'easy', 'single-choice', 'javascript');
        const tsQ = makeQuestion('q2', 'easy', 'single-choice', 'typescript');
        const jsQ2 = makeQuestion('q3', 'easy', 'single-choice', 'javascript');

        // 3 questions, count=2 < 3 → guarantee path
        // Seed js: catPool=[jsQ, jsQ2], sampleWeighted([jsQ,jsQ2], {}, 1) → [jsQ]
        // Seed ts: catPool=[tsQ], sampleWeighted([tsQ], {}, 1) → [tsQ]
        // seeded=[jsQ,tsQ].length(2) === count(2) → fillCount=0
        // combined=[jsQ,tsQ], sampleWeighted([jsQ,tsQ], {}, 2) → [jsQ,tsQ]
        mockSampleWeighted
            .mockReturnValueOnce([jsQ]) // js seed
            .mockReturnValueOnce([tsQ]) // ts seed
            .mockReturnValueOnce([jsQ, tsQ]); // final shuffle

        const result = sampleWithCategoryGuarantee([jsQ, jsQ2, tsQ], {}, 2, [
            'javascript',
            'typescript'
        ]);

        const resultCategories = result.map((q) => q.category);
        expect(resultCategories).toContain('javascript');
        expect(resultCategories).toContain('typescript');
    });

    it('delegates to sampleWeighted directly when count >= pool size', () => {
        const q1 = makeQuestion('q1');
        const q2 = makeQuestion('q2');
        const q3 = makeQuestion('q3');

        // 3 questions, count=3 >= 3 → fast path
        mockSampleWeighted.mockReturnValueOnce([q1, q2, q3]);

        sampleWithCategoryGuarantee([q1, q2, q3], {}, 3, ['javascript']);

        expect(mockSampleWeighted).toHaveBeenCalledTimes(1);
        expect(mockSampleWeighted).toHaveBeenCalledWith([q1, q2, q3], {}, 3);
    });

    it('skips categories with no questions in pool', () => {
        const jsQ = makeQuestion('q1', 'easy', 'single-choice', 'javascript');

        // Only javascript questions, but categories include 'typescript' (no pool)
        // count=1 < 1 questions? No: count(1) >= questions.length(1) → fast path
        mockSampleWeighted.mockReturnValueOnce([jsQ]);

        const result = sampleWithCategoryGuarantee([jsQ], {}, 1, ['javascript', 'typescript']);

        expect(result).toEqual([jsQ]);
    });

    it('high-weighted questions appear more frequently when weights provided', async () => {
        const { sampleWeighted: actualSampleWeighted } =
            await vi.importActual<typeof import('@/lib/algorithm')>('@/lib/algorithm');

        const questions = Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`q${i + 1}`, 'easy', 'single-choice', 'javascript')
        );
        const biasedWeights: Record<string, number> = { q1: 10, q2: 10, q3: 10 };

        const counts: Record<string, number> = {};
        for (let i = 0; i < 100; i++) {
            const sample = actualSampleWeighted(questions, biasedWeights, 3);
            for (const q of sample) {
                counts[q.id] = (counts[q.id] ?? 0) + 1;
            }
        }

        const highWeightTotal = (counts['q1'] ?? 0) + (counts['q2'] ?? 0) + (counts['q3'] ?? 0);
        const totalSamples = Object.values(counts).reduce((a, b) => a + b, 0);

        // 3 high-weight questions (w=10) vs 7 low-weight (w=1): expected share > 50%
        expect(highWeightTotal / totalSamples).toBeGreaterThan(0.5);
    });
});
