import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ALGORITHM_CONFIG } from '@/lib/algorithm/config';

// Mock storageService before importing the store
const mockStorageService = {
    getWeights: vi.fn(() => ({}) as Record<string, number>),
    setWeights: vi.fn(),
    getErrorRates: vi.fn(() => ({}) as Record<string, number>),
    setErrorRates: vi.fn(),
    getStreak: vi.fn(() => ({ current: 0, lastActivityDate: '' })),
    setStreak: vi.fn(),
    getRecords: vi.fn(() => ({}) as Record<string, number>),
    setRecord: vi.fn(),
    getLastSessionResults: vi.fn(() => ({}) as Record<string, boolean>),
    setLastSessionResults: vi.fn()
};

vi.mock('@/lib/storage', () => ({
    storageService: mockStorageService
}));

// Import store after mock is set up
const { useProgressStoreBase } = await import('./progressStore');

describe('progressStore — recordAnswer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store state to empty defaults
        useProgressStoreBase.setState({
            weights: {},
            errorRates: {},
            streak: { current: 0, lastActivityDate: '' },
            records: {},
            lastSessionResults: {}
        });
    });

    it('updates error rate for the given category on wrong answer', () => {
        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);

        const { errorRates } = useProgressStoreBase.getState();
        // initial=0, wrong: 0*(1-0.2)+0.2 = 0.2
        expect(errorRates['react']).toBeCloseTo(0.2);
    });

    it('updates error rate for the given category on correct answer', () => {
        // seed category with some error rate
        useProgressStoreBase.setState({ errorRates: { react: 0.5 } });
        useProgressStoreBase.getState().recordAnswer('q1', 'react', true);

        const { errorRates } = useProgressStoreBase.getState();
        // 0.5*(1-0.2) = 0.4
        expect(errorRates['react']).toBeCloseTo(0.4);
    });

    it('updates weight for the given questionId', () => {
        // High error rate → weight should increase
        useProgressStoreBase.setState({ errorRates: { react: 0.5 } });
        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);

        const { weights } = useProgressStoreBase.getState();
        // newErrorRate = 0.5*(0.8)+0.2 = 0.6 > HIGH_ERROR_THRESHOLD(0.4)
        // newWeight = DEFAULT(1.0) * HIGH_MULTIPLIER(2.0) = 2.0
        expect(weights['q1']).toBeCloseTo(2.0);
    });

    it('clamps weight at MAX_WEIGHT', () => {
        // Set a very high existing weight near maximum
        useProgressStoreBase.setState({
            weights: { q1: ALGORITHM_CONFIG.MAX_WEIGHT },
            errorRates: { react: 0.9 }
        });
        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);

        const { weights } = useProgressStoreBase.getState();
        expect(weights['q1']).toBeLessThanOrEqual(ALGORITHM_CONFIG.MAX_WEIGHT);
    });

    it('floors weight at MIN_WEIGHT', () => {
        // Low error rate → weight decreases; start near MIN_WEIGHT
        useProgressStoreBase.setState({
            weights: { q1: ALGORITHM_CONFIG.MIN_WEIGHT },
            errorRates: { react: 0 }
        });
        useProgressStoreBase.getState().recordAnswer('q1', 'react', true);

        const { weights } = useProgressStoreBase.getState();
        expect(weights['q1']).toBeGreaterThanOrEqual(ALGORITHM_CONFIG.MIN_WEIGHT);
    });

    it('handles stale questionId (not in any pool) without crashing', () => {
        expect(() => {
            useProgressStoreBase.getState().recordAnswer('stale-id-xyz', 'react', true);
        }).not.toThrow();

        const { weights } = useProgressStoreBase.getState();
        expect(weights['stale-id-xyz']).toBeDefined();
    });

    it('persists error rates via storageService.setErrorRates', () => {
        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);
        expect(mockStorageService.setErrorRates).toHaveBeenCalledOnce();
    });

    it('persists weights via storageService.setWeights', () => {
        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);
        expect(mockStorageService.setWeights).toHaveBeenCalledOnce();
    });
});

describe('progressStore — updateStreak', () => {
    const TODAY = '2026-04-09';
    const YESTERDAY = '2026-04-08';
    const TWO_DAYS_AGO = '2026-04-07';

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-09T12:00:00Z'));
        useProgressStoreBase.setState({
            weights: {},
            errorRates: {},
            streak: { current: 0, lastActivityDate: '' },
            records: {},
            lastSessionResults: {}
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('first session (lastActivityDate empty) → streak becomes 1', () => {
        useProgressStoreBase.getState().updateStreak();

        const { streak } = useProgressStoreBase.getState();
        expect(streak.current).toBe(1);
        expect(streak.lastActivityDate).toBe(TODAY);
    });

    it('same day call → streak unchanged (no-op)', () => {
        useProgressStoreBase.setState({ streak: { current: 3, lastActivityDate: TODAY } });
        useProgressStoreBase.getState().updateStreak();

        const { streak } = useProgressStoreBase.getState();
        expect(streak.current).toBe(3);
    });

    it('consecutive day → streak increments', () => {
        useProgressStoreBase.setState({ streak: { current: 5, lastActivityDate: YESTERDAY } });
        useProgressStoreBase.getState().updateStreak();

        const { streak } = useProgressStoreBase.getState();
        expect(streak.current).toBe(6);
        expect(streak.lastActivityDate).toBe(TODAY);
    });

    it('gap of 2+ days → streak resets to 1', () => {
        useProgressStoreBase.setState({ streak: { current: 10, lastActivityDate: TWO_DAYS_AGO } });
        useProgressStoreBase.getState().updateStreak();

        const { streak } = useProgressStoreBase.getState();
        expect(streak.current).toBe(1);
        expect(streak.lastActivityDate).toBe(TODAY);
    });

    it('persists new streak via storageService.setStreak', () => {
        useProgressStoreBase.setState({ streak: { current: 2, lastActivityDate: YESTERDAY } });
        useProgressStoreBase.getState().updateStreak();

        expect(mockStorageService.setStreak).toHaveBeenCalledOnce();
        expect(mockStorageService.setStreak).toHaveBeenCalledWith({
            current: 3,
            lastActivityDate: TODAY
        });
    });

    it('same day call → setStreak not called', () => {
        useProgressStoreBase.setState({ streak: { current: 3, lastActivityDate: TODAY } });
        useProgressStoreBase.getState().updateStreak();

        expect(mockStorageService.setStreak).not.toHaveBeenCalled();
    });
});

describe('progressStore — initial load from storageService', () => {
    it('reads errorRates from storageService when store is created', async () => {
        const savedRates = { react: 0.4, typescript: 0.2 };
        mockStorageService.getErrorRates.mockReturnValue(savedRates);
        mockStorageService.getWeights.mockReturnValue({});
        mockStorageService.getStreak.mockReturnValue({ current: 0, lastActivityDate: '' });
        mockStorageService.getRecords.mockReturnValue({});
        mockStorageService.getLastSessionResults.mockReturnValue({});

        // vi.resetModules clears the module cache so the next import creates a fresh store
        // vi.mock registrations persist across resets, so @/lib/storage stays mocked
        vi.resetModules();
        const { useProgressStoreBase: freshStore } = await import('./progressStore');

        expect(freshStore.getState().errorRates).toEqual(savedRates);
    });

    it('uses restored error rates for subsequent recordAnswer calls', () => {
        const savedRates = { react: 0.6 };
        useProgressStoreBase.setState({ errorRates: savedRates, weights: {} });

        useProgressStoreBase.getState().recordAnswer('q1', 'react', true);

        const { errorRates } = useProgressStoreBase.getState();
        // 0.6*(1-0.2) = 0.48
        expect(errorRates['react']).toBeCloseTo(0.48);
    });
});

describe('progressStore — recordAnswer weighs the question by its own outcome', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useProgressStoreBase.setState({
            weights: {},
            errorRates: {},
            streak: { current: 0, lastActivityDate: '' },
            records: {},
            lastSessionResults: {}
        });
    });

    it('lowers the question weight on a correct answer inside a weak category', () => {
        useProgressStoreBase.setState({ weights: { q1: 2 }, errorRates: { react: 0.9 } });

        useProgressStoreBase.getState().recordAnswer('q1', 'react', true);

        expect(useProgressStoreBase.getState().weights['q1']).toBeCloseTo(1.0);
    });

    it('raises the question weight on a wrong answer inside a strong category', () => {
        useProgressStoreBase.setState({ weights: { q1: 1 }, errorRates: { react: 0 } });

        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);

        expect(useProgressStoreBase.getState().weights['q1']).toBeCloseTo(2.0);
    });

    it('leaves the other questions of the category untouched', () => {
        useProgressStoreBase.setState({ weights: { q1: 1, q2: 1 }, errorRates: { react: 0.9 } });

        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);

        expect(useProgressStoreBase.getState().weights['q2']).toBeCloseTo(1.0);
    });

    it('still moves the category error rate — it feeds the home widget and focus areas', () => {
        useProgressStoreBase.setState({ weights: {}, errorRates: { react: 0.5 } });

        useProgressStoreBase.getState().recordAnswer('q1', 'react', false);

        expect(useProgressStoreBase.getState().errorRates['react']).toBeCloseTo(0.6);
    });
});

describe('progressStore — updateStreak counts the local calendar day', () => {
    const ORIGINAL_TZ = process.env.TZ;

    function resetProgress() {
        useProgressStoreBase.setState({
            weights: {},
            errorRates: {},
            streak: { current: 0, lastActivityDate: '' },
            records: {},
            lastSessionResults: {}
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        resetProgress();
    });

    afterEach(() => {
        vi.useRealTimers();
        if (ORIGINAL_TZ === undefined) delete process.env.TZ;
        else process.env.TZ = ORIGINAL_TZ;
    });

    it('increments once for two sessions on the same local day east of UTC', () => {
        process.env.TZ = 'Europe/Kyiv';

        vi.setSystemTime(new Date(2026, 9, 6, 2, 0, 0));
        useProgressStoreBase.getState().updateStreak();
        vi.setSystemTime(new Date(2026, 9, 6, 22, 0, 0));
        useProgressStoreBase.getState().updateStreak();

        const { streak } = useProgressStoreBase.getState();
        expect(streak.current).toBe(1);
        expect(streak.lastActivityDate).toBe('2026-10-06');
    });

    it('increments once for two sessions on the same local day west of UTC', () => {
        process.env.TZ = 'America/New_York';

        vi.setSystemTime(new Date(2026, 9, 6, 2, 0, 0));
        useProgressStoreBase.getState().updateStreak();
        vi.setSystemTime(new Date(2026, 9, 6, 22, 0, 0));
        useProgressStoreBase.getState().updateStreak();

        const { streak } = useProgressStoreBase.getState();
        expect(streak.current).toBe(1);
        expect(streak.lastActivityDate).toBe('2026-10-06');
    });

    it('treats the DST fall-back day and the day after as consecutive', () => {
        process.env.TZ = 'Europe/Kyiv';
        useProgressStoreBase.setState({ streak: { current: 4, lastActivityDate: '2026-10-25' } });

        vi.setSystemTime(new Date(2026, 9, 26, 12, 0, 0));
        useProgressStoreBase.getState().updateStreak();

        const { streak } = useProgressStoreBase.getState();
        expect(streak.current).toBe(5);
        expect(streak.lastActivityDate).toBe('2026-10-26');
    });

    it('resets when a local day was skipped around the DST fall-back', () => {
        process.env.TZ = 'Europe/Kyiv';
        useProgressStoreBase.setState({ streak: { current: 4, lastActivityDate: '2026-10-24' } });

        vi.setSystemTime(new Date(2026, 9, 26, 12, 0, 0));
        useProgressStoreBase.getState().updateStreak();

        expect(useProgressStoreBase.getState().streak.current).toBe(1);
    });
});
