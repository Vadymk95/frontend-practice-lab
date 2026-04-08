import { useCallback } from 'react';

import { useSessionStore } from '@/store/session';

export function useQuestionCard() {
    const questionList = useSessionStore.use.questionList();
    const currentIndex = useSessionStore.use.currentIndex();
    const answers = useSessionStore.use.answers();
    const removeAnswer = useSessionStore.use.removeAnswer();

    const question = questionList[currentIndex] ?? null;
    const isAnswered = question !== null && answers[question.id] !== undefined;

    const handleBack = useCallback(() => {
        if (question) removeAnswer(question.id);
    }, [question, removeAnswer]);

    return { question, currentIndex, questionCount: questionList.length, isAnswered, handleBack };
}
