import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question } from '@/lib/data/schema';

import { useCategoryQuestions } from './useCategoryQuestions';

const makeQuestion = (id: string): Question => ({
    id,
    type: 'single-choice',
    category: 'javascript',
    difficulty: 'easy',
    tags: [],
    question: `Question ${id}`,
    explanation: `Explanation ${id}`,
    options: ['A', 'B'],
    correct: 0
});

function makeWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    });
    return ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
    vi.spyOn(global, 'fetch');
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useCategoryQuestions', () => {
    it('returns combined questions from all slugs', async () => {
        const jsQuestions = [makeQuestion('js-1'), makeQuestion('js-2')];
        const tsQuestions = [makeQuestion('ts-1')];

        vi.mocked(global.fetch)
            .mockResolvedValueOnce(new Response(JSON.stringify(jsQuestions), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(tsQuestions), { status: 200 }));

        const { result } = renderHook(() => useCategoryQuestions(['javascript', 'typescript']), {
            wrapper: makeWrapper()
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.data).toHaveLength(3);
        expect(result.current.isError).toBe(false);
    });

    it('isLoading is true while fetch is pending', () => {
        vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));

        const { result } = renderHook(() => useCategoryQuestions(['javascript']), {
            wrapper: makeWrapper()
        });

        expect(result.current.isLoading).toBe(true);
    });

    it('isError is true when any category fetch fails', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce(new Response('Not found', { status: 404 }));

        const { result } = renderHook(() => useCategoryQuestions(['missing-category']), {
            wrapper: makeWrapper()
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isError).toBe(true);
    });

    it('validates response against CategoryFileSchema', async () => {
        // Invalid question data — missing required fields
        const invalid = [{ id: 'bad', type: 'unknown-type' }];

        vi.mocked(global.fetch).mockResolvedValueOnce(
            new Response(JSON.stringify(invalid), { status: 200 })
        );

        const { result } = renderHook(() => useCategoryQuestions(['javascript']), {
            wrapper: makeWrapper()
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isError).toBe(true);
    });

    it('returns empty data when no slugs provided', () => {
        const { result } = renderHook(() => useCategoryQuestions([]), {
            wrapper: makeWrapper()
        });

        expect(result.current.data).toHaveLength(0);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(false);
    });
});
