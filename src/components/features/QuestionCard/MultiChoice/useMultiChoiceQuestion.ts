import { useCallback, useEffect, useState } from 'react';

import type { MultiChoiceQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

export function useMultiChoiceQuestion(
    question: MultiChoiceQuestion,
    onSelectionChange: (hasSelection: boolean) => void,
    onCheckRegister: (checkFn: () => void) => void
) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isChecked, setIsChecked] = useState(false);
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
    }, [selectedIndices, isChecked, setAnswer, question.id]);

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
