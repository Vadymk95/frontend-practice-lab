import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ManifestEntry } from '@/hooks/data/useCategories';
import { useCategories } from '@/hooks/data/useCategories';
import type { SessionPreset } from '@/lib/storage/types';
import { useSessionStore } from '@/store/session';

import { usePresetRow } from './usePresetRow';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
    const mod = await importOriginal<typeof import('react-router-dom')>();
    return { ...mod, useNavigate: () => navigateMock };
});

vi.mock('@/hooks/data/useCategories', () => ({
    useCategories: vi.fn()
}));

const entry = (slug: string): ManifestEntry => ({
    slug,
    displayName: slug,
    counts: { easy: 4, medium: 0, hard: 0, total: 4, quiz: 4, bugFinding: 0, codeCompletion: 0 },
    matrix: {
        easy: { quiz: 4, bugFinding: 0, codeCompletion: 0 },
        medium: { quiz: 0, bugFinding: 0, codeCompletion: 0 },
        hard: { quiz: 0, bugFinding: 0, codeCompletion: 0 }
    }
});

const preset: SessionPreset = {
    id: 'p-1',
    name: 'Old preset',
    config: {
        categories: ['javascript', 'retired-topic'],
        questionCount: 10,
        difficulty: 'all',
        mode: 'all',
        order: 'random'
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    lastUsedAt: '2026-01-01T00:00:00.000Z'
};

function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return createElement(
        MemoryRouter,
        null,
        createElement(QueryClientProvider, { client: qc }, children)
    );
}

const mockManifest = (entries: ManifestEntry[]) => {
    vi.mocked(useCategories).mockReturnValue({
        data: entries,
        isLoading: false,
        isError: false
    } as unknown as ReturnType<typeof useCategories>);
};

beforeEach(() => {
    navigateMock.mockReset();
    useSessionStore.getState().resetSession();
});

describe('usePresetRow — launching a preset the content has moved on from', () => {
    it('starts with only the categories that still exist', () => {
        mockManifest([entry('javascript')]);

        const { result } = renderHook(() => usePresetRow(preset), { wrapper });
        act(() => result.current.handleLaunch());

        expect(useSessionStore.getState().config?.categories).toEqual(['javascript']);
        expect(useSessionStore.getState().config?.questionCount).toBe(4);
        expect(navigateMock).toHaveBeenCalledWith('/session/play');
    });

    it('does not start a session when no category of the preset survives', () => {
        mockManifest([entry('css')]);

        const { result } = renderHook(() => usePresetRow(preset), { wrapper });
        act(() => result.current.handleLaunch());

        expect(useSessionStore.getState().config).toBeNull();
        expect(navigateMock).toHaveBeenCalledWith('/', {
            replace: true,
            state: { flash: 'presetOutdated' }
        });
    });
});
