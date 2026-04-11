import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProgressStoreBase } from '@/store/progress/progressStore';

import { useResetWeightsDialog } from './useResetWeightsDialog';

// Mock fetch for category JSON
const mockQuestions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockQuestions
    })
);

// Mock CategoryFileSchema.parse to just return the data (schema parsing tested separately)
vi.mock('@/lib/data/schema', () => ({
    CategoryFileSchema: {
        parse: (data: unknown) => data
    }
}));

// Mock useCategories
vi.mock('@/hooks/data/useCategories', () => ({
    useCategories: () => ({
        data: [
            { slug: 'react', displayName: 'React' },
            { slug: 'typescript', displayName: 'TypeScript' }
        ],
        isLoading: false
    })
}));

beforeEach(() => {
    // Reset store to known state before each test
    useProgressStoreBase.setState({
        weights: { q1: 2.0, q2: 1.5, q3: 0.8, q4: 3.0 },
        errorRates: { react: 0.4, typescript: 0.2 }
    });
    vi.clearAllMocks();
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockQuestions
        })
    );
});

describe('useResetWeightsDialog', () => {
    it('exposes isOpen false by default', () => {
        const { result } = renderHook(() => useResetWeightsDialog());
        expect(result.current.isOpen).toBe(false);
    });

    it('open() sets isOpen to true', () => {
        const { result } = renderHook(() => useResetWeightsDialog());
        act(() => result.current.open());
        expect(result.current.isOpen).toBe(true);
    });

    it('close() sets isOpen to false', () => {
        const { result } = renderHook(() => useResetWeightsDialog());
        act(() => result.current.open());
        act(() => result.current.close());
        expect(result.current.isOpen).toBe(false);
    });

    it('resetAll clears all weights and errorRates in store', async () => {
        const { result } = renderHook(() => useResetWeightsDialog());

        await act(async () => {
            await result.current.resetAll();
        });

        expect(useProgressStoreBase.getState().weights).toEqual({});
        expect(useProgressStoreBase.getState().errorRates).toEqual({});
    });

    it('does not affect session records on resetAll', async () => {
        const sessionRecords = { someSession: 3600000 };
        useProgressStoreBase.setState({ records: sessionRecords });

        const { result } = renderHook(() => useResetWeightsDialog());

        await act(async () => {
            await result.current.resetAll();
        });

        expect(useProgressStoreBase.getState().records).toEqual(sessionRecords);
    });

    it('resetCategory clears only weights for that slug and removes its errorRate', async () => {
        const { result } = renderHook(() => useResetWeightsDialog());

        await act(async () => {
            await result.current.resetCategory('react');
        });

        // q1, q2, q3 belong to 'react' (from mock fetch) — should be removed
        const weights = useProgressStoreBase.getState().weights;
        expect(weights).not.toHaveProperty('q1');
        expect(weights).not.toHaveProperty('q2');
        expect(weights).not.toHaveProperty('q3');
        // q4 does NOT belong to 'react' — should remain
        expect(weights).toHaveProperty('q4', 3.0);

        // errorRates for 'react' removed, 'typescript' preserved
        const errorRates = useProgressStoreBase.getState().errorRates;
        expect(errorRates).not.toHaveProperty('react');
        expect(errorRates).toHaveProperty('typescript', 0.2);
    });

    it('sets successMessage after resetAll, then clears after 2 seconds', async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useResetWeightsDialog());

        await act(async () => {
            await result.current.resetAll();
        });

        expect(result.current.successMessage).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.successMessage).toBeNull();
        vi.useRealTimers();
    });

    it('sets successMessage after resetCategory, then clears after 2 seconds', async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useResetWeightsDialog());

        await act(async () => {
            await result.current.resetCategory('react');
        });

        expect(result.current.successMessage).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.successMessage).toBeNull();
        vi.useRealTimers();
    });

    it('auto-closes dialog after successMessage timeout', async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useResetWeightsDialog());

        act(() => result.current.open());
        expect(result.current.isOpen).toBe(true);

        await act(async () => {
            await result.current.resetAll();
        });

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.isOpen).toBe(false);
        vi.useRealTimers();
    });

    it('exposes categories from useCategories', () => {
        const { result } = renderHook(() => useResetWeightsDialog());
        expect(result.current.categories).toEqual([
            { slug: 'react', displayName: 'React' },
            { slug: 'typescript', displayName: 'TypeScript' }
        ]);
    });
});
