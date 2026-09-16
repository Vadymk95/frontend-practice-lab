import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question } from '@/lib/data/schema';
import type { SessionConfig } from '@/lib/storage/types';
import { useSessionStore } from '@/store/session';

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
    it('replaces the play route when ending a session so Back cannot return to it', () => {
        const { result } = renderHook(() => useSessionPlayPage(), { wrapper });

        act(() => {
            result.current.confirmEndSession();
        });

        expect(navigateMock).toHaveBeenCalledWith('/', {
            replace: true,
            state: { flash: 'sessionEnded' }
        });
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
