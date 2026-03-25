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

import { filterQuestions, sortByDifficulty, useSessionSetup } from './useSessionSetup';

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
    type: Question['type'] = 'single-choice'
): Question =>
    ({
        id,
        type,
        category: 'javascript',
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
            expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
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

    it('calls sampleWeighted with questionCount', async () => {
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

        mockSampleWeighted.mockReturnValue(questions.slice(0, 2));

        renderHook(() => useSessionSetup(), { wrapper: makeWrapper() });

        await waitFor(() => {
            expect(mockSampleWeighted).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Object),
                2
            );
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
});
