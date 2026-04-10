import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSessionSetup } from '@/hooks/session/useSessionSetup';
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

    const handleNext = useCallback(() => {
        if (isLastQuestion) {
            navigate(RoutesPath.SessionSummary);
        } else {
            nextQuestion();
        }
    }, [isLastQuestion, navigate, nextQuestion]);

    // P-2: setup complete but filtered results empty — go back home
    useEffect(() => {
        if (!isSetupLoading && !isSetupError && config && questionList.length === 0) {
            navigate(RoutesPath.Root, { replace: true });
        }
    }, [isSetupLoading, isSetupError, config, questionList.length, navigate]);

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
