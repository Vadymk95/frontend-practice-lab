import { useCallback, useEffect, useState } from 'react';

import { track } from '@/lib/analytics';
import type { MultiChoiceQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

export function useMultiChoiceQuestion(
    question: MultiChoiceQuestion,
    isSkipped: boolean,
    onSelectionChange: (hasSelection: boolean) => void,
    onCheckRegister: (checkFn: () => void) => void
) {
    const [_selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [_isChecked, setIsChecked] = useState(false);
    const selectedIndices = isSkipped ? question.correct : _selectedIndices;
    const isChecked = isSkipped || _isChecked;
    const setAnswer = useSessionStore.use.setAnswer();

    const onToggle = useCallback(
        (index: number) => {
            if (isChecked) return;
            setSelectedIndices((prev) => {
                const next = prev.includes(index)
                    ? prev.filter((i) => i !== index)
                    : [...prev, index];
                onSelectionChange(next.length > 0);
                return next;
            });
        },
        [isChecked, onSelectionChange]
    );

    const onCheck = useCallback(() => {
        if (selectedIndices.length === 0 || isChecked) return;
        setIsChecked(true);
        setAnswer(question.id, selectedIndices);
        const correct =
            [...selectedIndices].sort().join(',') === [...question.correct].sort().join(',');
        track('question_answered', {
            category: question.category,
            difficulty: question.difficulty,
            type: question.type,
            correct,
            timeMs: useSessionStore.getState().timerMs
        });
    }, [selectedIndices, isChecked, setAnswer, question]);

    // Register the check callback with the parent (SessionPlayPage via QuestionCard)
    useEffect(() => {
        onCheckRegister(onCheck);
    }, [onCheck, onCheckRegister]);

    // Reset state when question changes
    useEffect(() => {
        setSelectedIndices([]);
        setIsChecked(false);
        onSelectionChange(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    return { selectedIndices, isChecked, onToggle };
}
