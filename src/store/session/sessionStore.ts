import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { Question } from '@/lib/data/schema';
import type { SessionConfig } from '@/lib/storage/types';
import { createSelectors } from '@/store/utils/createSelectors';

type Answer = number | number[] | string | string[];

interface SessionState {
    questionList: Question[];
    currentIndex: number;
    answers: Record<string, Answer>;
    skipList: string[];
    config: SessionConfig | null;
    timerMs: number;
    // Actions
    setConfig: (config: SessionConfig) => void;
    setQuestionList: (questions: Question[]) => void;
    setAnswer: (questionId: string, answer: Answer) => void;
    removeAnswer: (questionId: string) => void;
    skipQuestion: (questionId: string) => void;
    nextQuestion: () => void;
    setTimerMs: (ms: number) => void;
    resetSession: () => void;
    setRepeatMistakes: (questions: Question[]) => void;
}

const initialState = {
    questionList: [] as Question[],
    currentIndex: 0,
    answers: {} as Record<string, Answer>,
    skipList: [] as string[],
    config: null as SessionConfig | null,
    timerMs: 0
};

const useSessionStoreBase = create<SessionState>()(
    devtools(
        (set) => ({
            ...initialState,
            setConfig: (config: SessionConfig) => {
                set({ ...initialState, config }, false, { type: 'session-store/setConfig' });
            },
            setQuestionList: (questionList: Question[]) => {
                set({ questionList, currentIndex: 0 }, false, {
                    type: 'session-store/setQuestionList'
                });
            },
            setAnswer: (questionId: string, answer: Answer) => {
                set((state) => ({ answers: { ...state.answers, [questionId]: answer } }), false, {
                    type: 'session-store/setAnswer'
                });
            },
            removeAnswer: (questionId: string) => {
                set(
                    (state) => {
                        const { [questionId]: _removed, ...rest } = state.answers;
                        return { answers: rest };
                    },
                    false,
                    { type: 'session-store/removeAnswer' }
                );
            },
            skipQuestion: (questionId: string) => {
                set((state) => ({ skipList: [...state.skipList, questionId] }), false, {
                    type: 'session-store/skipQuestion'
                });
            },
            nextQuestion: () => {
                set(
                    (state) => ({
                        currentIndex:
                            state.currentIndex < state.questionList.length - 1
                                ? state.currentIndex + 1
                                : state.currentIndex
                    }),
                    false,
                    { type: 'session-store/nextQuestion' }
                );
            },
            setTimerMs: (timerMs: number) => {
                set({ timerMs }, false, { type: 'session-store/setTimerMs' });
            },
            resetSession: () => {
                set(initialState, false, { type: 'session-store/resetSession' });
            },
            setRepeatMistakes: (questionList: Question[]) => {
                set(
                    { questionList, currentIndex: 0, answers: {}, skipList: [], timerMs: 0 },
                    false,
                    {
                        type: 'session-store/setRepeatMistakes'
                    }
                );
            }
        }),
        { name: 'session-store' }
    )
);

export const useSessionStore = createSelectors(useSessionStoreBase);
export { useSessionStoreBase };
