import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question } from '@/lib/data/schema';
import type { SessionConfig } from '@/lib/storage/types';
import { useSessionStore } from '@/store/session';
import { renderWithProviders } from '@/test/test-utils';

import { SessionPlayPage } from './SessionPlayPage';
import { useSessionPlayPage } from './useSessionPlayPage';

vi.mock('@/hooks/session/useSessionSetup', () => ({
    useSessionSetup: () => ({ isLoading: false, isError: false, refetch: vi.fn() })
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
    const mod = await importOriginal<typeof import('react-router-dom')>();
    return { ...mod, useNavigate: () => navigateMock };
});

const config: SessionConfig = {
    categories: ['javascript'],
    difficulty: 'all',
    mode: 'all',
    questionCount: 1,
    order: 'random'
};

const bugFindingQuestion = {
    id: 'bf-1',
    type: 'bug-finding',
    category: 'javascript',
    difficulty: 'easy',
    tags: [],
    question: { en: 'q', ru: 'q' },
    explanation: { en: 'e', ru: 'e' },
    code: 'foo()',
    correct: 'bug',
    referenceAnswer: 'fix'
} as unknown as Question;

function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return createElement(
        MemoryRouter,
        { initialEntries: ['/session/play'] },
        createElement(QueryClientProvider, { client: qc }, children)
    );
}

beforeEach(() => {
    navigateMock.mockReset();
    useSessionStore.setState({
        config,
        questionList: [bugFindingQuestion],
        currentIndex: 0,
        answers: {},
        skipList: [],
        timerMs: 0,
        endedAt: null
    });
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('useSessionPlayPage — bug-finding pending-self-assess gate', () => {
    it('blocks Next while bug-finding answer is the raw submission (pre self-assess)', () => {
        useSessionStore.setState({
            answers: { 'bf-1': 'some user-typed bug description' }
        });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });
        expect(result.current.isBugFindingPendingSelfAssess).toBe(true);
        expect(result.current.isAnswered).toBe(false);
    });

    it('allows Next once gotIt is stamped', () => {
        useSessionStore.setState({ answers: { 'bf-1': 'gotIt' } });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });
        expect(result.current.isBugFindingPendingSelfAssess).toBe(false);
        expect(result.current.isAnswered).toBe(true);
    });

    it('allows Next once missedIt is stamped', () => {
        useSessionStore.setState({ answers: { 'bf-1': 'missedIt' } });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });
        expect(result.current.isBugFindingPendingSelfAssess).toBe(false);
        expect(result.current.isAnswered).toBe(true);
    });

    it('allows Next when bug-finding question is skipped (skip is terminal — no self-assess required)', () => {
        // Regression: previously Skip on bug-finding stamped 'skipped' but the
        // pending-gate did not exempt it, so action bar stayed null AND the
        // in-card self-assess buttons hid (auto-derived missedIt on isSkipped),
        // leaving the user with no forward control.
        useSessionStore.setState({
            answers: { 'bf-1': 'skipped' },
            skipList: ['bf-1']
        });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });
        expect(result.current.isBugFindingPendingSelfAssess).toBe(false);
        expect(result.current.isAnswered).toBe(true);
    });
});

describe('useSessionPlayPage — leaving the session', () => {
    it('replaces the play route when ending an untouched session so Back cannot return to it', () => {
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });

        act(() => {
            result.current.confirmEndSession();
        });

        expect(navigateMock).toHaveBeenCalledWith('/', {
            replace: true,
            state: { flash: 'sessionEnded' }
        });
        expect(useSessionStore.getState().questionList).toHaveLength(0);
    });

    it('scores what was answered on the summary instead of discarding the session', () => {
        const second = { ...bugFindingQuestion, id: 'bf-2' } as Question;
        const third = { ...bugFindingQuestion, id: 'bf-3' } as Question;
        useSessionStore.setState({
            questionList: [bugFindingQuestion, second, third],
            answers: { 'bf-1': 'gotIt' },
            currentIndex: 1
        });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });

        act(() => {
            result.current.confirmEndSession();
        });

        expect(navigateMock).toHaveBeenCalledWith('/session/summary');
        const state = useSessionStore.getState();
        expect(state.questionList.map((q) => q.id)).toEqual(['bf-1']);
        expect(state.answers).toEqual({ 'bf-1': 'gotIt' });
        expect(state.endedAt).toBeNull();
    });

    it('keeps a skipped question in the scored list so the summary still reports it', () => {
        const second = { ...bugFindingQuestion, id: 'bf-2' } as Question;
        useSessionStore.setState({
            questionList: [bugFindingQuestion, second],
            answers: { 'bf-1': 'skipped' },
            skipList: ['bf-1']
        });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });

        act(() => {
            result.current.confirmEndSession();
        });

        expect(navigateMock).toHaveBeenCalledWith('/session/summary');
        expect(useSessionStore.getState().questionList.map((q) => q.id)).toEqual(['bf-1']);
    });

    it('warns that progress is lost only while nothing has been answered', () => {
        const { result, rerender } = renderHook(() => useSessionPlayPage(), { wrapper });
        expect(result.current.willScoreOnEnd).toBe(false);

        act(() => {
            useSessionStore.setState({ answers: { 'bf-1': 'gotIt' } });
        });
        rerender();

        expect(result.current.willScoreOnEnd).toBe(true);
    });

    it('explains the bounce home when the configured filters match no questions', async () => {
        useSessionStore.setState({ questionList: [] });

        renderHook(() => useSessionPlayPage(), { wrapper });

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/', {
                replace: true,
                state: { flash: 'noQuestionsMatch' }
            });
        });
    });
});

const singleChoiceQuestion = {
    id: 'sc-1',
    type: 'single-choice',
    category: 'javascript',
    difficulty: 'easy',
    tags: [],
    question: { en: 'Pick one', ru: 'Pick one' },
    explanation: { en: 'e', ru: 'e' },
    options: [
        { en: 'Alpha', ru: 'Alpha' },
        { en: 'Beta', ru: 'Beta' },
        { en: 'Gamma', ru: 'Gamma' }
    ],
    correct: 0
} as unknown as Question;

/** Original bank index of the option rendered at `displayIndex` (options are shuffled at render). */
function originalIndexOfDisplayed(question: Question, displayIndex: number): number {
    if (question.type !== 'single-choice') throw new Error('single-choice fixture expected');
    const radios = screen.getAllByRole('radio');
    const label = radios[displayIndex]?.textContent ?? '';
    return question.options.findIndex((o) => label.includes(o.en));
}

describe('SessionPlayPage — keyboard shortcuts reach the rendered question', () => {
    it('selects the second option when the "2" key is pressed', async () => {
        useSessionStore.setState({ questionList: [singleChoiceQuestion], answers: {} });

        renderWithProviders(createElement(SessionPlayPage));
        expect(await screen.findByText('Beta')).toBeInTheDocument();

        // Options are shuffled at render; the key selects the SECOND DISPLAYED option and the
        // store must receive that option's ORIGINAL index.
        const expected = originalIndexOfDisplayed(singleChoiceQuestion, 1);
        fireEvent.keyDown(document, { key: '2' });

        await waitFor(() => {
            expect(useSessionStore.getState().answers['sc-1']).toBe(expected);
        });
    });

    it('still selects on the question after a Next, when the refs are re-registered', async () => {
        const second = { ...singleChoiceQuestion, id: 'sc-2' } as Question;
        useSessionStore.setState({
            questionList: [singleChoiceQuestion, second],
            currentIndex: 1,
            answers: {}
        });

        renderWithProviders(createElement(SessionPlayPage));
        expect(await screen.findByText('Gamma')).toBeInTheDocument();

        const expected = originalIndexOfDisplayed(second, 2);
        fireEvent.keyDown(document, { key: '3' });

        await waitFor(() => {
            expect(useSessionStore.getState().answers['sc-2']).toBe(expected);
        });
    });
});

describe('SessionPlayPage — the end dialog states what ending will do', () => {
    it('promises results for the answered questions once something is answered', async () => {
        useSessionStore.setState({
            questionList: [singleChoiceQuestion],
            answers: { 'sc-1': 0 }
        });

        renderWithProviders(createElement(SessionPlayPage));
        fireEvent.click(screen.getByRole('button', { name: /End session/i }));

        expect(
            await screen.findByText(/questions you answered will be scored/i)
        ).toBeInTheDocument();
    });

    it('warns that progress is lost while the session is untouched', async () => {
        useSessionStore.setState({ questionList: [singleChoiceQuestion], answers: {} });

        renderWithProviders(createElement(SessionPlayPage));
        fireEvent.click(screen.getByRole('button', { name: /End session/i }));

        expect(await screen.findByText(/progress will not be saved/i)).toBeInTheDocument();
    });
});

describe('useSessionPlayPage — dialog suspends the shortcuts', () => {
    it('does not advance the question when Enter is pressed with the end dialog open', () => {
        useSessionStore.setState({ answers: { 'bf-1': 'gotIt' } });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });

        act(() => {
            result.current.openEndDialog();
        });
        fireEvent.keyDown(document, { key: 'Enter' });

        expect(navigateMock).not.toHaveBeenCalled();
    });
});
