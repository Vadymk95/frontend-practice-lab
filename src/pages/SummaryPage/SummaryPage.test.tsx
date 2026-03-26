import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question } from '@/lib/data/schema';
import { useProgressStoreBase } from '@/store/progress/progressStore';
import { useSessionStoreBase } from '@/store/session/sessionStore';

import { useSummaryPage } from './useSummaryPage';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
    const mod = await importOriginal<typeof import('react-router-dom')>();
    return { ...mod, useNavigate: () => navigateMock };
});

const mockSaveSessionResults = vi.fn();
vi.mock('@/store/progress', () => ({
    useProgressStore: {
        use: {
            saveSessionResults: () => mockSaveSessionResults
        }
    }
}));

// Mock question: correct answer is index 1 ('4')
const mockQuestion: Question = {
    id: 'q-001',
    type: 'single-choice' as const,
    category: 'JavaScript',
    difficulty: 'easy' as const,
    tags: [],
    question: 'What is 2+2?',
    explanation: 'Basic math.',
    options: ['3', '4', '5'],
    correct: 1
} as unknown as Question;

const mockQuestion2: Question = {
    id: 'q-002',
    type: 'single-choice' as const,
    category: 'JavaScript',
    difficulty: 'easy' as const,
    tags: [],
    question: 'What is 1+1?',
    explanation: 'Basic math.',
    options: ['1', '2', '3'],
    correct: 1
} as unknown as Question;

const mockQuestion3: Question = {
    id: 'q-003',
    type: 'single-choice' as const,
    category: 'TypeScript',
    difficulty: 'medium' as const,
    tags: [],
    question: 'What is TS?',
    explanation: 'TS explanation.',
    options: ['A', 'B', 'C'],
    correct: 0
} as unknown as Question;

/** Generates N single-choice questions in the given category; correct answer is always index 0. */
function generateQuestions(count: number, category: string, baseId: string): Question[] {
    return Array.from(
        { length: count },
        (_, i) =>
            ({
                id: `${baseId}-${i}`,
                type: 'single-choice' as const,
                category,
                difficulty: 'easy' as const,
                tags: [],
                question: `Question ${i}`,
                explanation: 'Explanation.',
                options: ['A', 'B', 'C'],
                correct: 0
            }) as unknown as Question
    );
}

function makeWrapper() {
    return ({ children }: { children: React.ReactNode }) =>
        createElement(MemoryRouter, { initialEntries: ['/session/summary'] }, children);
}

function resetStores(overrides?: { questionList?: Question[]; answers?: Record<string, unknown> }) {
    useSessionStoreBase.setState({
        questionList: overrides?.questionList ?? [mockQuestion],
        answers: (overrides?.answers ?? { 'q-001': 1 }) as Record<
            string,
            number | number[] | string | string[]
        >,
        currentIndex: 0,
        config: null,
        skipList: [],
        timerMs: 0
    });
    useProgressStoreBase.setState({
        weights: {},
        errorRates: {},
        streak: { current: 0, lastActivityDate: '' },
        records: {},
        lastSessionResults: {}
    });
}

beforeEach(() => {
    navigateMock.mockReset();
    mockSaveSessionResults.mockReset();
    resetStores();
});

afterEach(() => {
    vi.clearAllMocks();
    useSessionStoreBase.setState({
        questionList: [],
        answers: {},
        currentIndex: 0,
        config: null,
        skipList: [],
        timerMs: 0
    });
});

describe('useSummaryPage', () => {
    it('redirects to / when questionList is empty (direct URL access)', () => {
        resetStores({ questionList: [], answers: {} });

        renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });

    it('calculates correctCount = 1 when answer matches correct index', () => {
        // q-001 correct is 1, answer is 1 → correct
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.correctCount).toBe(1);
        expect(result.current.wrongCount).toBe(0);
    });

    it('calculates correctCount = 1 out of 2 when one answer is wrong', () => {
        // q-001 correct=1, answer=1 → correct
        // q-002 correct=1, answer=0 → wrong
        resetStores({
            questionList: [mockQuestion, mockQuestion2],
            answers: { 'q-001': 1, 'q-002': 0 }
        });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.correctCount).toBe(1);
        expect(result.current.wrongCount).toBe(1);
        expect(result.current.totalCount).toBe(2);
    });

    it('isPerfectScore is true when all answers are correct', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.isPerfectScore).toBe(true);
    });

    it('isPerfectScore is false when there are wrong answers', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 0 } });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.isPerfectScore).toBe(false);
    });

    it('identifies weak topics where error rate > 30%', () => {
        // JavaScript: 1 question, 1 wrong → 100% error → weak
        resetStores({
            questionList: [mockQuestion],
            answers: { 'q-001': 0 } // wrong
        });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.weakTopics).toContain('JavaScript');
    });

    it('does NOT list topic as weak when error rate is 0%', () => {
        // JavaScript: 2 questions, 0 wrong → 0% error → not weak
        resetStores({
            questionList: [mockQuestion, mockQuestion2],
            answers: { 'q-001': 1, 'q-002': 1 } // both correct
        });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.weakTopics).not.toContain('JavaScript');
    });

    it('does NOT list topic as weak when error rate is exactly 30% (threshold is strictly >30%)', () => {
        // JavaScript: 10 questions, 3 wrong = exactly 30% — NOT weak (threshold is > 0.3, not ≥)
        const jsQuestions = generateQuestions(10, 'JavaScript', 'js-b');
        // correct answer is 0 for all; first 3 answered wrong (answer=1), rest correct (answer=0)
        const answers: Record<string, number> = {};
        jsQuestions.forEach((q, i) => {
            answers[q.id] = i < 3 ? 1 : 0;
        });

        resetStores({ questionList: jsQuestions, answers });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.weakTopics).not.toContain('JavaScript');
        expect(result.current.weakTopics).toHaveLength(0);
    });

    it('identifies weak topic for JavaScript, not TypeScript when TypeScript is answered correctly', () => {
        // JavaScript (q-001): answer 0, correct 1 → wrong → weak
        // TypeScript (q-003): answer 0, correct 0 → correct → not weak
        resetStores({
            questionList: [mockQuestion, mockQuestion3],
            answers: { 'q-001': 0, 'q-003': 0 }
        });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.weakTopics).toContain('JavaScript');
        expect(result.current.weakTopics).not.toContain('TypeScript');
    });

    it('calls saveSessionResults on mount', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });

        renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(mockSaveSessionResults).toHaveBeenCalledOnce();
        expect(mockSaveSessionResults).toHaveBeenCalledWith({ 'q-001': true });
    });

    it('calls setRepeatMistakes with wrong questions on handleRepeatMistakes', () => {
        const setRepeatMistakesMock = vi.fn();
        useSessionStoreBase.setState({
            questionList: [mockQuestion],
            answers: { 'q-001': 0 } as Record<string, number | number[] | string | string[]>, // wrong
            currentIndex: 0,
            config: null,
            skipList: [],
            timerMs: 0,
            setRepeatMistakes: setRepeatMistakesMock
        } as unknown as Parameters<typeof useSessionStoreBase.setState>[0]);

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        act(() => {
            result.current.handleRepeatMistakes();
        });

        expect(setRepeatMistakesMock).toHaveBeenCalledWith([mockQuestion]);
    });

    it('navigates to /session/play after handleRepeatMistakes', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 0 } }); // wrong answer

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        act(() => {
            result.current.handleRepeatMistakes();
        });

        expect(navigateMock).toHaveBeenCalledWith('/session/play');
    });

    it('calls setRepeatMistakes with full questionList on handleTryAgain (perfect score)', () => {
        const setRepeatMistakesMock = vi.fn();
        useSessionStoreBase.setState({
            questionList: [mockQuestion],
            answers: { 'q-001': 1 } as Record<string, number | number[] | string | string[]>, // correct
            currentIndex: 0,
            config: null,
            skipList: [],
            timerMs: 0,
            setRepeatMistakes: setRepeatMistakesMock
        } as unknown as Parameters<typeof useSessionStoreBase.setState>[0]);

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        act(() => {
            result.current.handleTryAgain();
        });

        expect(setRepeatMistakesMock).toHaveBeenCalledWith([mockQuestion]);
    });

    it('navigates to /session/play after handleTryAgain', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } }); // correct answer

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        act(() => {
            result.current.handleTryAgain();
        });

        expect(navigateMock).toHaveBeenCalledWith('/session/play');
    });

    it('navigates to / on handleHome', () => {
        resetStores();

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        act(() => {
            result.current.handleHome();
        });

        expect(navigateMock).toHaveBeenCalledWith('/');
    });
});
