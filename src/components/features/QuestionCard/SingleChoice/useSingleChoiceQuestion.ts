import { useCallback, useEffect, useState } from 'react';

import { track } from '@/lib/analytics';
import type { SingleChoiceQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

export function useSingleChoiceQuestion(
    question: SingleChoiceQuestion,
    isSkipped = false,
    onSelectOptionRegister?: (fn: (idx: number) => void) => void
) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(
        isSkipped ? question.correct : null
    );
    const setAnswer = useSessionStore.use.setAnswer();
    const isAnswered = isSkipped || selectedIndex !== null;

    const onSelect = useCallback(
        (index: number) => {
            if (isAnswered) return;
            setSelectedIndex(index);
            setAnswer(question.id, index);
            track('question_answered', {
                category: question.category,
                difficulty: question.difficulty,
                type: question.type,
                correct: index === question.correct,
                timeMs: useSessionStore.getState().timerMs
            });
        },
        [isAnswered, question, setAnswer]
    );

    // Reset when question changes (navigation forward)
    useEffect(() => {
        setSelectedIndex(null);
    }, [question.id]);

    useEffect(() => {
        onSelectOptionRegister?.(onSelect);
    }, [onSelect, onSelectOptionRegister]);

    return { selectedIndex, isAnswered, onSelect };
}
