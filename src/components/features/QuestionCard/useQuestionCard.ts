import { useCallback } from 'react';

import { useSessionStore } from '@/store/session';

export function useQuestionCard() {
    const questionList = useSessionStore.use.questionList();
    const currentIndex = useSessionStore.use.currentIndex();
    const answers = useSessionStore.use.answers();
    const removeAnswer = useSessionStore.use.removeAnswer();
    const skipList = useSessionStore.use.skipList();
    const skipQuestion = useSessionStore.use.skipQuestion();
    const setAnswer = useSessionStore.use.setAnswer();

    const question = questionList[currentIndex] ?? null;
    const isAnswered = question !== null && answers[question.id] !== undefined;
    const isSkipped = question !== null && skipList.includes(question.id);

    const handleBack = useCallback(() => {
        if (question) removeAnswer(question.id);
    }, [question, removeAnswer]);

    const handleSkip = useCallback(() => {
        if (question && !isSkipped) {
            skipQuestion(question.id);
            setAnswer(question.id, 'skipped');
        }
    }, [question, isSkipped, skipQuestion, setAnswer]);

    return {
        question,
        currentIndex,
        questionCount: questionList.length,
        isAnswered,
        handleBack,
        isSkipped,
        handleSkip
    };
}
