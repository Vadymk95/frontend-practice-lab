import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { calculateWeight, updateErrorRate } from '@/lib/algorithm';
import { ALGORITHM_CONFIG } from '@/lib/algorithm/config';
import { isYesterday } from '@/lib/date';
import { storageService } from '@/lib/storage';
import type { StreakData } from '@/lib/storage/types';
import { createSelectors } from '@/store/utils/createSelectors';

interface ProgressState {
    weights: Record<string, number>;
    errorRates: Record<string, number>;
    streak: StreakData;
    records: Record<string, number>;
    lastSessionResults: Record<string, boolean>;
    // Actions
    setWeights: (weights: Record<string, number>) => void;
    setErrorRates: (rates: Record<string, number>) => void;
    setStreak: (data: StreakData) => void;
    setRecord: (key: string, ms: number) => void;
    saveSessionResults: (results: Record<string, boolean>) => void;
    recordAnswer: (questionId: string, category: string, correct: boolean) => void;
    updateStreak: () => void;
}

const useProgressStoreBase = create<ProgressState>()(
    devtools(
        (set, get) => ({
            weights: storageService.getWeights(),
            errorRates: storageService.getErrorRates(),
            streak: storageService.getStreak(),
            records: storageService.getRecords(),
            lastSessionResults: storageService.getLastSessionResults(),

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
            },
            saveSessionResults: (results: Record<string, boolean>) => {
                storageService.setLastSessionResults(results);
                set({ lastSessionResults: results }, false, {
                    type: 'progress-store/saveSessionResults'
                });
            },
            updateStreak: () => {
                const { streak } = get();
                const today = new Date().toISOString().slice(0, 10);

                if (streak.lastActivityDate === today) return;

                const isConsecutive = isYesterday(streak.lastActivityDate, today);
                const newStreak: StreakData = {
                    current: isConsecutive ? streak.current + 1 : 1,
                    lastActivityDate: today
                };
                storageService.setStreak(newStreak);
                set({ streak: newStreak }, false, { type: 'progress-store/updateStreak' });
            },
            recordAnswer: (questionId: string, category: string, correct: boolean) => {
                const { errorRates, weights } = get();
                const prevErrorRate = errorRates[category] ?? 0;
                const newErrorRate = updateErrorRate(prevErrorRate, correct);
                const newRates = { ...errorRates, [category]: newErrorRate };

                const prevWeight = weights[questionId] ?? ALGORITHM_CONFIG.DEFAULT_WEIGHT;
                const newWeight = calculateWeight(newErrorRate, prevWeight);
                const newWeights = { ...weights, [questionId]: newWeight };

                storageService.setErrorRates(newRates);
                storageService.setWeights(newWeights);
                set({ errorRates: newRates, weights: newWeights }, false, {
                    type: 'progress-store/recordAnswer'
                });
            }
        }),
        { name: 'progress-store' }
    )
);

export const useProgressStore = createSelectors(useProgressStoreBase);
export { useProgressStoreBase };
