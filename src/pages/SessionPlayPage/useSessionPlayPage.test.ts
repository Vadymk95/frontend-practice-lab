import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createContext, createElement, useContext, useState } from 'react';
import type { createMemoryRouter as CreateMemoryRouter } from 'react-router-dom';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question } from '@/lib/data/schema';
import type { SessionConfig } from '@/lib/storage/types';
import { useSessionStore } from '@/store/session';
// Imported for its side effect only: it owns the shared i18next test init. Its render helper
// builds a MemoryRouter, and this page needs a data router because it blocks navigation.
import '@/test/test-utils';

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

/** The data router renders the subject through this host, so rerenders reach it as context. */
const SubjectContext = createContext<ReactNode>(null);

function SubjectHost() {
    return useContext(SubjectContext);
}

/** The router of the most recently mounted harness — the handle for driving a browser Back. */
let activeRouter: ReturnType<typeof CreateMemoryRouter>;

function Harness({ children }: { children: ReactNode }) {
    const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    const [router] = useState(() => {
        activeRouter = createMemoryRouter([{ path: '*', Component: SubjectHost }], {
            initialEntries: ['/', '/session/play'],
            initialIndex: 1
        });
        return activeRouter;
    });

    return createElement(
        SubjectContext.Provider,
        { value: children },
        createElement(
            QueryClientProvider,
            { client: qc },
            createElement(RouterProvider, { router })
        )
    );
}

function renderPlayPage() {
    return render(createElement(SessionPlayPage), { wrapper: Harness });
}

beforeEach(() => {
    // jsdom implements neither of these; the page calls both when an answer is revealed.
    Element.prototype.scrollIntoView = vi.fn();
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
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });
        expect(result.current.isBugFindingPendingSelfAssess).toBe(true);
        expect(result.current.isAnswered).toBe(false);
    });

    it('allows Next once gotIt is stamped', () => {
        useSessionStore.setState({ answers: { 'bf-1': 'gotIt' } });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });
        expect(result.current.isBugFindingPendingSelfAssess).toBe(false);
        expect(result.current.isAnswered).toBe(true);
    });

    it('allows Next once missedIt is stamped', () => {
        useSessionStore.setState({ answers: { 'bf-1': 'missedIt' } });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });
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
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });
        expect(result.current.isBugFindingPendingSelfAssess).toBe(false);
        expect(result.current.isAnswered).toBe(true);
    });
});

describe('useSessionPlayPage — leaving the session', () => {
    it('replaces the play route when ending an untouched session so Back cannot return to it', () => {
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });

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
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });

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
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });

        act(() => {
            result.current.confirmEndSession();
        });

        expect(navigateMock).toHaveBeenCalledWith('/session/summary');
        expect(useSessionStore.getState().questionList.map((q) => q.id)).toEqual(['bf-1']);
    });

    it('warns that progress is lost only while nothing has been answered', () => {
        const { result, rerender } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });
        expect(result.current.willScoreOnEnd).toBe(false);

        act(() => {
            useSessionStore.setState({ answers: { 'bf-1': 'gotIt' } });
        });
        rerender();

        expect(result.current.willScoreOnEnd).toBe(true);
    });

    it('explains the bounce home when the configured filters match no questions', async () => {
        useSessionStore.setState({ questionList: [] });

        renderHook(() => useSessionPlayPage(), { wrapper: Harness });

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

        renderPlayPage();
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

        renderPlayPage();
        expect(await screen.findByText('Gamma')).toBeInTheDocument();

        const expected = originalIndexOfDisplayed(second, 2);
        fireEvent.keyDown(document, { key: '3' });

        await waitFor(() => {
            expect(useSessionStore.getState().answers['sc-2']).toBe(expected);
        });
    });
});

describe('SessionPlayPage — the answer feedback is brought into view', () => {
    it('scrolls the forward control into view once the answer is revealed', async () => {
        useSessionStore.setState({ questionList: [singleChoiceQuestion], answers: {} });
        renderPlayPage();
        await screen.findByText('Beta');
        expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

        fireEvent.keyDown(document, { key: '1' });

        await waitFor(() => {
            expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
                block: 'end',
                behavior: 'smooth'
            });
        });
    });

    it('jumps instead of gliding when the viewer asked for reduced motion', async () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({ matches: true }))
        );
        useSessionStore.setState({ questionList: [singleChoiceQuestion], answers: {} });
        renderPlayPage();
        await screen.findByText('Beta');

        fireEvent.keyDown(document, { key: '1' });

        await waitFor(() => {
            expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
                block: 'end',
                behavior: 'auto'
            });
        });
        vi.unstubAllGlobals();
    });
});

describe('SessionPlayPage — the advance control names where it leads', () => {
    it('offers the results on the last question instead of another Next', async () => {
        useSessionStore.setState({
            questionList: [singleChoiceQuestion],
            answers: { 'sc-1': 0 }
        });

        renderPlayPage();

        expect(await screen.findAllByRole('button', { name: /Show results/i })).not.toHaveLength(0);
        expect(screen.queryByRole('button', { name: /^Next$/i })).not.toBeInTheDocument();
    });

    it('still offers Next while questions remain', async () => {
        const second = { ...singleChoiceQuestion, id: 'sc-2' } as Question;
        useSessionStore.setState({
            questionList: [singleChoiceQuestion, second],
            currentIndex: 0,
            answers: { 'sc-1': 0 }
        });

        renderPlayPage();

        expect(await screen.findAllByRole('button', { name: /^Next$/i })).not.toHaveLength(0);
    });
});

describe('SessionPlayPage — the end dialog states what ending will do', () => {
    it('promises results for the answered questions once something is answered', async () => {
        useSessionStore.setState({
            questionList: [singleChoiceQuestion],
            answers: { 'sc-1': 0 }
        });

        renderPlayPage();
        fireEvent.click(screen.getByRole('button', { name: /End session/i }));

        expect(
            await screen.findByText(/questions you answered will be scored/i)
        ).toBeInTheDocument();
    });

    it('warns that progress is lost while the session is untouched', async () => {
        useSessionStore.setState({ questionList: [singleChoiceQuestion], answers: {} });

        renderPlayPage();
        fireEvent.click(screen.getByRole('button', { name: /End session/i }));

        expect(await screen.findByText(/progress will not be saved/i)).toBeInTheDocument();
    });
});

describe('SessionPlayPage — focus after the end dialog closes', () => {
    it('returns focus to the control that opened the dialog when Escape closes it', async () => {
        useSessionStore.setState({ questionList: [singleChoiceQuestion], answers: {} });
        renderPlayPage();

        const trigger = screen.getByRole('button', { name: /End session/i });
        trigger.focus();
        fireEvent.click(trigger);
        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(document.activeElement).toBe(trigger);
    });

    it('returns focus to the trigger when the dialog is dismissed from its own button', async () => {
        useSessionStore.setState({ questionList: [singleChoiceQuestion], answers: {} });
        renderPlayPage();

        const trigger = screen.getByRole('button', { name: /End session/i });
        trigger.focus();
        fireEvent.click(trigger);
        fireEvent.click(await screen.findByRole('button', { name: /Continue session/i }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(document.activeElement).toBe(trigger);
    });
});

describe('SessionPlayPage — leaving through browser navigation', () => {
    it('asks for confirmation before a Back gesture abandons a live session', async () => {
        useSessionStore.setState({
            questionList: [singleChoiceQuestion],
            answers: { 'sc-1': 0 }
        });
        renderPlayPage();

        await act(async () => {
            await activeRouter.navigate(-1);
        });

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(activeRouter.state.location.pathname).toBe('/session/play');
    });

    it('keeps the user on the question when the confirmation is dismissed', async () => {
        useSessionStore.setState({
            questionList: [singleChoiceQuestion],
            answers: { 'sc-1': 0 }
        });
        renderPlayPage();

        await act(async () => {
            await activeRouter.navigate(-1);
        });
        fireEvent.click(await screen.findByRole('button', { name: /Continue session/i }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(activeRouter.state.location.pathname).toBe('/session/play');
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it('runs the normal end flow when the confirmation is accepted', async () => {
        useSessionStore.setState({
            questionList: [singleChoiceQuestion],
            answers: { 'sc-1': 0 }
        });
        renderPlayPage();

        await act(async () => {
            await activeRouter.navigate(-1);
        });
        fireEvent.click(await screen.findByRole('button', { name: /^End session$/i }));

        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/session/summary');
        });
    });

    it('does not block the navigation once the session is over', async () => {
        useSessionStore.setState({ questionList: [], answers: {} });
        renderPlayPage();

        await act(async () => {
            await activeRouter.navigate(-1);
        });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(activeRouter.state.location.pathname).toBe('/');
    });
});

describe('useSessionPlayPage — dialog suspends the shortcuts', () => {
    it('does not advance the question when Enter is pressed with the end dialog open', () => {
        useSessionStore.setState({ answers: { 'bf-1': 'gotIt' } });
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper: Harness });

        act(() => {
            result.current.openEndDialog();
        });
        fireEvent.keyDown(document, { key: 'Enter' });

        expect(navigateMock).not.toHaveBeenCalled();
    });
});
