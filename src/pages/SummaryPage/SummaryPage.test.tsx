import { renderHook, act, screen } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question } from '@/lib/data/schema';
import { useProgressStoreBase } from '@/store/progress/progressStore';
import { useSessionStoreBase } from '@/store/session/sessionStore';
import { renderWithProviders } from '@/test/test-utils';

import { SummaryPage } from './SummaryPage';
import { useSummaryPage } from './useSummaryPage';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
    const mod = await importOriginal<typeof import('react-router-dom')>();
    return { ...mod, useNavigate: () => navigateMock };
});

const mockSaveSessionResults = vi.fn();
const mockRecordAnswer = vi.fn();
const mockUpdateStreak = vi.fn();
const mockSetRecord = vi.fn();
let mockStreakData = { current: 0, lastActivityDate: '' };
let mockRecordsData: Record<string, number> = {};
vi.mock('@/store/progress', () => ({
    useProgressStore: {
        use: {
            saveSessionResults: () => mockSaveSessionResults,
            recordAnswer: () => mockRecordAnswer,
            updateStreak: () => mockUpdateStreak,
            streak: () => mockStreakData,
            records: () => mockRecordsData,
            setRecord: () => mockSetRecord
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

function resetStores(overrides?: {
    questionList?: Question[];
    answers?: Record<string, unknown>;
    skipList?: string[];
}) {
    useSessionStoreBase.setState({
        questionList: overrides?.questionList ?? [mockQuestion],
        answers: (overrides?.answers ?? { 'q-001': 1 }) as Record<
            string,
            number | number[] | string | string[]
        >,
        currentIndex: 0,
        config: null,
        skipList: overrides?.skipList ?? [],
        timerMs: 0,
        endedAt: null,
        scoredAt: null,
        isRepeat: false
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
    mockRecordAnswer.mockReset();
    mockUpdateStreak.mockReset();
    mockSetRecord.mockReset();
    mockStreakData = { current: 0, lastActivityDate: '' };
    mockRecordsData = {};
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
        timerMs: 0,
        endedAt: null,
        scoredAt: null,
        isRepeat: false
    });
});

describe('useSummaryPage', () => {
    it('redirects to / when questionList is empty (direct URL access)', () => {
        resetStores({ questionList: [], answers: {} });

        renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(navigateMock).toHaveBeenCalledWith('/', {
            replace: true,
            state: { flash: 'summaryUnavailable' }
        });
    });

    it('calculates correctCount = 1 when answer matches correct index', () => {
        // q-001 correct is 1, answer is 1 → correct
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.correctCount).toBe(1);
        expect(result.current.pureWrongCount).toBe(0);
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
        expect(result.current.pureWrongCount).toBe(1);
        expect(result.current.totalCount).toBe(2);
    });

    it('isPerfectScore is true when all answers are correct and no skipped', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 }, skipList: [] });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.isPerfectScore).toBe(true);
    });

    it('isPerfectScore is false when there are wrong answers', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 0 } });

        const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(result.current.isPerfectScore).toBe(false);
    });

    it('isPerfectScore is false when there are skipped questions', () => {
        resetStores({
            questionList: [mockQuestion],
            answers: { 'q-001': 'skipped' },
            skipList: ['q-001']
        });

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

    it('calls saveSessionResults and recordAnswer on mount', () => {
        resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });

        renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

        expect(mockSaveSessionResults).toHaveBeenCalledOnce();
        expect(mockSaveSessionResults).toHaveBeenCalledWith({ 'q-001': true });
        expect(mockRecordAnswer).toHaveBeenCalledOnce();
        expect(mockRecordAnswer).toHaveBeenCalledWith('q-001', 'JavaScript', true);
    });

    describe('scoring runs once per session', () => {
        it('records every answer once when the summary is remounted', () => {
            resetStores({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 1, 'q-002': 1 }
            });

            const first = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });
            first.unmount();
            renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(mockRecordAnswer).toHaveBeenCalledTimes(2);
            expect(mockSaveSessionResults).toHaveBeenCalledOnce();
            expect(mockUpdateStreak).toHaveBeenCalledOnce();
        });

        it('stamps scoredAt on the session store', () => {
            resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });

            renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(useSessionStoreBase.getState().scoredAt).toBeTypeOf('number');
        });

        it('scores a repeat-mistakes session again once the marker is cleared', () => {
            resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });

            const first = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });
            first.unmount();

            act(() => {
                useSessionStoreBase.getState().setRepeatMistakes([mockQuestion2]);
            });
            useSessionStoreBase.setState({
                answers: { 'q-002': 1 } as Record<string, number | number[] | string | string[]>
            });

            renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(mockRecordAnswer).toHaveBeenCalledWith('q-002', 'JavaScript', true);
        });
    });

    describe('skipped questions', () => {
        it('does not feed a skipped question to the adaptive algorithm', () => {
            resetStores({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 1, 'q-002': 'skipped' },
                skipList: ['q-002']
            });

            renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(mockRecordAnswer).toHaveBeenCalledOnce();
            expect(mockRecordAnswer).toHaveBeenCalledWith('q-001', 'JavaScript', true);
        });

        it('still counts a skipped question as not correct in the displayed score', () => {
            resetStores({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 1, 'q-002': 'skipped' },
                skipList: ['q-002']
            });

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.correctCount).toBe(1);
            expect(result.current.totalCount).toBe(2);
            expect(result.current.skippedCount).toBe(1);
        });

        it('still saves the skipped question in the session results', () => {
            resetStores({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 1, 'q-002': 'skipped' },
                skipList: ['q-002']
            });

            renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(mockSaveSessionResults).toHaveBeenCalledWith({ 'q-001': true, 'q-002': false });
        });
    });

    describe('review subsets', () => {
        it('pureWrongCount excludes skipped questions', () => {
            // q-001 wrong (not skipped), q-002 skipped
            resetStores({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 0, 'q-002': 'skipped' },
                skipList: ['q-002']
            });

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.pureWrongCount).toBe(1);
            expect(result.current.skippedCount).toBe(1);
            expect(result.current.allMistakesCount).toBe(2);
        });

        it('allMistakesCount is deduped union of wrong + skipped', () => {
            // q-001 wrong and skipped (edge case: in both sets)
            // q-002 wrong but not skipped
            resetStores({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 'skipped', 'q-002': 0 },
                skipList: ['q-001']
            });

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            // q-001 is skipped only, q-002 is wrong only → total 2
            expect(result.current.allMistakesCount).toBe(2);
        });

        it('skippedCount equals skipList length', () => {
            resetStores({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 'skipped', 'q-002': 'skipped' },
                skipList: ['q-001', 'q-002']
            });

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.skippedCount).toBe(2);
        });
    });

    describe('personal record', () => {
        const timedConfig = {
            categories: ['JavaScript'],
            questionCount: 20,
            difficulty: 'all',
            mode: 'all',
            order: 'random',
            timerEnabled: true
        } as const;

        it('stores a record for a normal timed session', () => {
            resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });
            useSessionStoreBase.setState({ config: timedConfig, timerMs: 300_000 });

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.isNewRecord).toBe(true);
            expect(mockSetRecord).toHaveBeenCalledOnce();
        });

        it('never overwrites the record from a repeat-mistakes session', () => {
            // A 3-question repeat shares the record key of the 20-question run it came from, and
            // setRepeatMistakes zeroes the timer — so it would always look like a personal best.
            mockRecordsData = { 'JavaScript|all|all|20': 300_000 };
            resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });
            useSessionStoreBase.setState({
                config: timedConfig,
                timerMs: 40_000,
                isRepeat: true
            });

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.isNewRecord).toBe(false);
            expect(mockSetRecord).not.toHaveBeenCalled();
        });

        it('still reports the prior record on a repeat session', () => {
            mockRecordsData = { 'JavaScript|all|all|20': 300_000 };
            resetStores({ questionList: [mockQuestion], answers: { 'q-001': 1 } });
            useSessionStoreBase.setState({
                config: timedConfig,
                timerMs: 40_000,
                isRepeat: true
            });

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.priorRecordMs).toBe(300_000);
        });
    });

    describe('handlers', () => {
        it('handleRepeatWrong calls setRepeatMistakes with pureWrong questions and navigates', () => {
            const setRepeatMistakesMock = vi.fn();
            useSessionStoreBase.setState({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 0, 'q-002': 'skipped' } as Record<
                    string,
                    number | number[] | string | string[]
                >,
                currentIndex: 0,
                config: null,
                skipList: ['q-002'],
                timerMs: 0,
                setRepeatMistakes: setRepeatMistakesMock
            } as unknown as Parameters<typeof useSessionStoreBase.setState>[0]);

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            act(() => {
                result.current.handleRepeatWrong();
            });

            expect(setRepeatMistakesMock).toHaveBeenCalledWith([mockQuestion]);
            expect(navigateMock).toHaveBeenCalledWith('/session/play');
        });

        it('handleRepeatSkipped calls setRepeatMistakes with skipped questions and navigates', () => {
            const setRepeatMistakesMock = vi.fn();
            useSessionStoreBase.setState({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 1, 'q-002': 'skipped' } as Record<
                    string,
                    number | number[] | string | string[]
                >,
                currentIndex: 0,
                config: null,
                skipList: ['q-002'],
                timerMs: 0,
                setRepeatMistakes: setRepeatMistakesMock
            } as unknown as Parameters<typeof useSessionStoreBase.setState>[0]);

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            act(() => {
                result.current.handleRepeatSkipped();
            });

            expect(setRepeatMistakesMock).toHaveBeenCalledWith([mockQuestion2]);
            expect(navigateMock).toHaveBeenCalledWith('/session/play');
        });

        it('handleRepeatAllMistakes calls setRepeatMistakes with all mistakes and navigates', () => {
            const setRepeatMistakesMock = vi.fn();
            useSessionStoreBase.setState({
                questionList: [mockQuestion, mockQuestion2],
                answers: { 'q-001': 0, 'q-002': 'skipped' } as Record<
                    string,
                    number | number[] | string | string[]
                >,
                currentIndex: 0,
                config: null,
                skipList: ['q-002'],
                timerMs: 0,
                setRepeatMistakes: setRepeatMistakesMock
            } as unknown as Parameters<typeof useSessionStoreBase.setState>[0]);

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            act(() => {
                result.current.handleRepeatAllMistakes();
            });

            expect(setRepeatMistakesMock).toHaveBeenCalledWith([mockQuestion, mockQuestion2]);
            expect(navigateMock).toHaveBeenCalledWith('/session/play');
        });

        it('handleRestartSession calls setRepeatMistakes with full questionList and navigates', () => {
            const setRepeatMistakesMock = vi.fn();
            useSessionStoreBase.setState({
                questionList: [mockQuestion],
                answers: { 'q-001': 1 } as Record<string, number | number[] | string | string[]>,
                currentIndex: 0,
                config: null,
                skipList: [],
                timerMs: 0,
                setRepeatMistakes: setRepeatMistakesMock
            } as unknown as Parameters<typeof useSessionStoreBase.setState>[0]);

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            act(() => {
                result.current.handleRestartSession();
            });

            expect(setRepeatMistakesMock).toHaveBeenCalledWith([mockQuestion]);
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

    describe('streak', () => {
        const TODAY = '2026-04-09';
        const YESTERDAY = '2026-04-08';
        const OLD_DATE = '2026-03-01';

        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-04-09T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('isStreakReset is false for first-ever session (empty lastActivityDate)', () => {
            mockStreakData = { current: 0, lastActivityDate: '' };
            resetStores();

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.isStreakReset).toBe(false);
        });

        it('isStreakReset is false when last session was yesterday (consecutive)', () => {
            mockStreakData = { current: 5, lastActivityDate: YESTERDAY };
            resetStores();

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.isStreakReset).toBe(false);
        });

        it('isStreakReset is false when last session was today (same-day repeat)', () => {
            mockStreakData = { current: 3, lastActivityDate: TODAY };
            resetStores();

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.isStreakReset).toBe(false);
        });

        it('isStreakReset is true when gap > 1 day (streak broken)', () => {
            mockStreakData = { current: 10, lastActivityDate: OLD_DATE };
            resetStores();

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.isStreakReset).toBe(true);
        });

        it('streak value is passed through from the store', () => {
            mockStreakData = { current: 7, lastActivityDate: YESTERDAY };
            resetStores();

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.streak.current).toBe(7);
        });

        it('is false when the last session was earlier on the same local day', () => {
            // 02:00 in Kyiv is still the previous day in UTC — a UTC day key reports a broken
            // streak to a user who practised a few hours ago.
            const originalTz = process.env.TZ;
            process.env.TZ = 'Europe/Kyiv';
            vi.setSystemTime(new Date(2026, 9, 6, 2, 0, 0));
            mockStreakData = { current: 4, lastActivityDate: '2026-10-06' };
            resetStores();

            const { result } = renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(result.current.isStreakReset).toBe(false);

            if (originalTz === undefined) delete process.env.TZ;
            else process.env.TZ = originalTz;
        });

        it('calls updateStreak on mount', () => {
            resetStores();

            renderHook(() => useSummaryPage(), { wrapper: makeWrapper() });

            expect(mockUpdateStreak).toHaveBeenCalledOnce();
        });
    });
});

describe('SummaryPage — page chrome', () => {
    const weakTopicQuestion = {
        id: 'q-ai',
        type: 'single-choice' as const,
        category: 'ai-llm',
        difficulty: 'easy' as const,
        tags: [],
        question: { en: 'Which model?', ru: 'Which model?' },
        explanation: { en: 'Because.', ru: 'Because.' },
        options: [
            { en: 'A', ru: 'A' },
            { en: 'B', ru: 'B' }
        ],
        correct: 0
    } as unknown as Question;

    it('announces the page with a heading', () => {
        resetStores();

        renderWithProviders(<SummaryPage />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Session Complete');
    });

    it('names weak topics by display name, not by slug', () => {
        resetStores({ questionList: [weakTopicQuestion], answers: { 'q-ai': 1 } });

        renderWithProviders(<SummaryPage />);

        expect(screen.getByText('AI / LLM')).toBeInTheDocument();
        expect(screen.queryByText('ai-llm')).not.toBeInTheDocument();
    });
});
