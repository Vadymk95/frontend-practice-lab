import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCategories } from './useCategories';

const validEntry = {
    slug: 'javascript',
    displayName: 'JavaScript',
    counts: { easy: 3, medium: 2, hard: 1, total: 6, quiz: 4, bugFinding: 1, codeCompletion: 1 },
    matrix: {
        easy: { quiz: 2, bugFinding: 0, codeCompletion: 1 },
        medium: { quiz: 1, bugFinding: 1, codeCompletion: 0 },
        hard: { quiz: 1, bugFinding: 0, codeCompletion: 0 }
    }
};

function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return createElement(QueryClientProvider, { client: qc }, children);
}

function mockFetch(json: () => Promise<unknown>, ok = true) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json }));
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useCategories', () => {
    it('returns the parsed manifest entries', async () => {
        mockFetch(() => Promise.resolve([validEntry]));

        const { result } = renderHook(() => useCategories(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.[0]?.matrix.easy.quiz).toBe(2);
    });

    it('errors on a manifest entry that does not match the schema', async () => {
        mockFetch(() => Promise.resolve([{ slug: 'javascript', displayName: 'JavaScript' }]));

        const { result } = renderHook(() => useCategories(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('errors when the body is not JSON at all (SPA rewrite serving index.html)', async () => {
        mockFetch(() => Promise.reject(new SyntaxError('Unexpected token <')));

        const { result } = renderHook(() => useCategories(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('errors on a non-ok response', async () => {
        mockFetch(() => Promise.resolve([validEntry]), false);

        const { result } = renderHook(() => useCategories(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
