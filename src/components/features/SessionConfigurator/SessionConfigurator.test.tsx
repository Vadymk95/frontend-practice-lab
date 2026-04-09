import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ManifestEntry } from '@/hooks/data/useCategories';
import { useCategories } from '@/hooks/data/useCategories';
import { useSessionStore } from '@/store/session';

import {
    computeAvailableCount,
    getFilteredCategoryCount,
    useSessionConfigurator
} from './useSessionConfigurator';

vi.mock('@/hooks/data/useCategories', () => ({
    useCategories: vi.fn()
}));

const mockCategories: ManifestEntry[] = [
    {
        slug: 'javascript',
        displayName: 'JavaScript',
        counts: { easy: 3, medium: 2, hard: 1, total: 6, quiz: 4, bugFinding: 1, codeCompletion: 1 }
    },
    {
        slug: 'typescript',
        displayName: 'TypeScript',
        counts: { easy: 2, medium: 2, hard: 2, total: 6, quiz: 3, bugFinding: 2, codeCompletion: 1 }
    }
];

function createWrapper() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    return ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MemoryRouter>
    );
}

describe('getFilteredCategoryCount', () => {
    const js = mockCategories[0];

    it('returns total for difficulty=all mode=all', () => {
        expect(getFilteredCategoryCount(js, 'all', 'all')).toBe(6);
    });

    it('returns difficulty count for specific difficulty, mode=all', () => {
        expect(getFilteredCategoryCount(js, 'easy', 'all')).toBe(3);
        expect(getFilteredCategoryCount(js, 'medium', 'all')).toBe(2);
        expect(getFilteredCategoryCount(js, 'hard', 'all')).toBe(1);
    });

    it('applies proportional mode filter', () => {
        // quiz=4, total=6, easy=3 → round(3 * 4/6) = round(2) = 2
        expect(getFilteredCategoryCount(js, 'easy', 'quiz')).toBe(2);
    });

    it('returns 0 when total is 0', () => {
        const empty = {
            slug: 'empty',
            displayName: 'Empty',
            counts: {
                easy: 0,
                medium: 0,
                hard: 0,
                total: 0,
                quiz: 0,
                bugFinding: 0,
                codeCompletion: 0
            }
        };
        expect(getFilteredCategoryCount(empty, 'all', 'quiz')).toBe(0);
    });
});

describe('computeAvailableCount', () => {
    it('returns 0 when no slugs selected', () => {
        expect(computeAvailableCount(mockCategories, [], 'all', 'all')).toBe(0);
    });

    it('returns total count for selected category with all filters', () => {
        expect(computeAvailableCount(mockCategories, ['javascript'], 'all', 'all')).toBe(6);
    });

    it('returns difficulty-filtered count', () => {
        expect(computeAvailableCount(mockCategories, ['javascript'], 'easy', 'all')).toBe(3);
    });

    it('sums counts for multiple selected categories', () => {
        expect(
            computeAvailableCount(mockCategories, ['javascript', 'typescript'], 'all', 'all')
        ).toBe(12);
    });

    it('applies mode filter using proportional estimate', () => {
        // javascript: quiz=4, total=6 → fraction=4/6, diffCount(easy)=3 → round(3*4/6)=round(2)=2
        const result = computeAvailableCount(mockCategories, ['javascript'], 'easy', 'quiz');
        expect(result).toBe(2);
    });
});

describe('useSessionConfigurator', () => {
    beforeEach(() => {
        vi.mocked(useCategories).mockReturnValue({
            data: mockCategories,
            isLoading: false,
            isError: false,
            error: null
        } as ReturnType<typeof useCategories>);
        useSessionStore.getState().resetSession();
    });

    it('starts with no categories selected and Start disabled', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        expect(result.current.selectedCategories).toHaveLength(0);
        expect(result.current.isStartEnabled).toBe(false);
    });

    it('toggling a category adds it to selectedCategories', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        expect(result.current.selectedCategories).toContain('javascript');
    });

    it('toggling an already-selected category removes it', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        expect(result.current.selectedCategories).not.toContain('javascript');
    });

    it('availableCount is 0 when no categories selected', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        expect(result.current.availableCount).toBe(0);
    });

    it('isStartEnabled is false when count is 0', () => {
        vi.mocked(useCategories).mockReturnValue({
            data: [
                {
                    slug: 'empty-cat',
                    displayName: 'Empty',
                    counts: {
                        easy: 0,
                        medium: 0,
                        hard: 0,
                        total: 0,
                        quiz: 0,
                        bugFinding: 0,
                        codeCompletion: 0
                    }
                }
            ],
            isLoading: false,
            isError: false,
            error: null
        } as ReturnType<typeof useCategories>);

        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('empty-cat');
        });
        expect(result.current.availableCount).toBe(0);
        expect(result.current.isStartEnabled).toBe(false);
    });

    it('handleStart calls setConfig with correct shape', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleStart();
        });
        const config = useSessionStore.getState().config;
        expect(config).not.toBeNull();
        expect(config?.categories).toContain('javascript');
        expect(config?.difficulty).toBe('all');
        expect(config?.mode).toBe('all');
        expect(config?.order).toBe('random');
    });

    it('categoryCountMap contains counts for all categories', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        expect(result.current.categoryCountMap).toHaveProperty('javascript');
        expect(result.current.categoryCountMap).toHaveProperty('typescript');
        expect(result.current.categoryCountMap['javascript']).toBe(6);
        expect(result.current.categoryCountMap['typescript']).toBe(6);
    });

    it('categoryCountMap updates when difficulty filter changes', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleDifficultyChange('easy');
        });
        // javascript: easy=3, typescript: easy=2
        expect(result.current.categoryCountMap['javascript']).toBe(3);
        expect(result.current.categoryCountMap['typescript']).toBe(2);
    });

    it('categoryCountMap updates when mode filter changes', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleModeChange('quiz');
        });
        // javascript: round(6 * 4/6) = 4, typescript: round(6 * 3/6) = 3
        expect(result.current.categoryCountMap['javascript']).toBe(4);
        expect(result.current.categoryCountMap['typescript']).toBe(3);
    });

    it('handleQuestionCountChange clamps value between 1 and maxCount', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleQuestionCountChange(0);
        });
        expect(result.current.questionCount).toBe(1);
        act(() => {
            result.current.handleQuestionCountChange(999);
        });
        expect(result.current.questionCount).toBeLessThanOrEqual(result.current.maxCount);
    });
});
