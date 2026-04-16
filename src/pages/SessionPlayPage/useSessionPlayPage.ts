import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSessionSetup } from '@/hooks/session/useSessionSetup';
import { track } from '@/lib/analytics';
import { RoutesPath } from '@/router/routes';
import { useSessionStore } from '@/store/session';

export function useSessionPlayPage() {
    const navigate = useNavigate();
    const { isLoading: isSetupLoading, isError: isSetupError, refetch } = useSessionSetup();
    const config = useSessionStore.use.config();
    const questionList = useSessionStore.use.questionList();
    const currentIndex = useSessionStore.use.currentIndex();
    const answers = useSessionStore.use.answers();
    const nextQuestion = useSessionStore.use.nextQuestion();
    const timerMs = useSessionStore.use.timerMs();
    const setTimerMs = useSessionStore.use.setTimerMs();

    const timerEnabled = config?.timerEnabled ?? false;

    const currentQuestion = questionList[currentIndex] ?? null;
    const isAnswered = currentQuestion !== null && answers[currentQuestion.id] !== undefined;
    const isLastQuestion = questionList.length > 0 && currentIndex === questionList.length - 1;

    const sessionCompletedRef = useRef(false);

    const handleNext = useCallback(() => {
        if (isLastQuestion) {
            sessionCompletedRef.current = true;
            navigate(RoutesPath.SessionSummary);
        } else {
            nextQuestion();
        }
    }, [isLastQuestion, navigate, nextQuestion]);

    // Fire session_abandoned when navigating away mid-session without completing
    useEffect(() => {
        return () => {
            if (sessionCompletedRef.current) return;
            const state = useSessionStore.getState();
            if (state.questionList.length > 0 && Object.keys(state.answers).length > 0) {
                track('session_abandoned', {
                    answered: Object.keys(state.answers).length,
                    total: state.questionList.length
                });
            }
        };
    }, []);

    // P-2: setup complete but filtered results empty — go back home
    // Use getState() to avoid stale closure: setQuestionList (called in useSessionSetup's
    // effect) updates the Zustand store synchronously, but the React closure here still
    // captures the pre-update questionList.length from the same render.
    useEffect(() => {
        if (
            !isSetupLoading &&
            !isSetupError &&
            config &&
            useSessionStore.getState().questionList.length === 0
        ) {
            navigate(RoutesPath.Root, { replace: true });
        }
    }, [isSetupLoading, isSetupError, config, navigate]);

    // Timer interval — starts when timerEnabled, clears on unmount
    useEffect(() => {
        if (!timerEnabled) return;
        const start = Date.now() - timerMs;
        const id = setInterval(() => {
            setTimerMs(Date.now() - start);
        }, 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerEnabled]); // only start once when timer is enabled

    // Keyboard: Enter advances to next question when answered
    useEffect(() => {
        if (!isAnswered) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            if (e.key === 'Enter') handleNext();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isAnswered, handleNext]);

    return {
        isSetupLoading,
        isSetupError,
        questionCount: questionList.length,
        currentIndex,
        currentQuestion,
        isAnswered,
        timerEnabled,
        timerMs,
        handleNext,
        onRetry: refetch
    };
}
