import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { storageService } from '@/lib/storage';
import type { StreakData } from '@/lib/storage/types';
import { createSelectors } from '@/store/utils/createSelectors';

interface ProgressState {
    weights: Record<string, number>;
    errorRates: Record<string, number>;
    streak: StreakData;
    records: Record<string, number>;
    // Actions
    setWeights: (weights: Record<string, number>) => void;
    setErrorRates: (rates: Record<string, number>) => void;
    setStreak: (data: StreakData) => void;
    setRecord: (key: string, ms: number) => void;
}

const useProgressStoreBase = create<ProgressState>()(
    devtools(
        (set, get) => ({
            weights: storageService.getWeights(),
            errorRates: storageService.getErrorRates(),
            streak: storageService.getStreak(),
            records: storageService.getRecords(),

            setWeights: (weights: Record<string, number>) => {
                storageService.setWeights(weights);
                set({ weights }, false, { type: 'progress-store/setWeights' });
            },
            setErrorRates: (rates: Record<string, number>) => {
                storageService.setErrorRates(rates);
                set({ errorRates: rates }, false, { type: 'progress-store/setErrorRates' });
            },
            setStreak: (data: StreakData) => {
                storageService.setStreak(data);
                set({ streak: data }, false, { type: 'progress-store/setStreak' });
            },
            setRecord: (key: string, ms: number) => {
                storageService.setRecord(key, ms);
                const records = { ...get().records, [key]: ms };
                set({ records }, false, { type: 'progress-store/setRecord' });
            }
        }),
        { name: 'progress-store' }
    )
);

export const useProgressStore = createSelectors(useProgressStoreBase);
