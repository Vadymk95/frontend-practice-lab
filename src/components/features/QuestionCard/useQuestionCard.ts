import { useSessionStore } from '@/store/session';

export function useQuestionCard() {
    const questionList = useSessionStore.use.questionList();
    const currentIndex = useSessionStore.use.currentIndex();
    return {
        question: questionList[currentIndex] ?? null,
        currentIndex,
        questionCount: questionList.length
    };
}
