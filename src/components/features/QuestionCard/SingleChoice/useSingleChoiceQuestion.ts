import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { track } from '@/lib/analytics';
import type { SingleChoiceQuestion } from '@/lib/data/schema';
import { createOptionOrder } from '@/lib/utils/optionOrder';
import { useSessionStore } from '@/store/session';

export function useSingleChoiceQuestion(
    question: SingleChoiceQuestion,
    isSkipped = false,
    onSelectOptionRegister?: (fn: (idx: number) => void) => void
) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(
        isSkipped ? question.correct : null
    );
    // One draw per mount — QuestionCard remounts the variant for every question, so the
    // displayed order can never shift under the user mid-question.
    const [optionOrder, setOptionOrder] = useState(() =>
        createOptionOrder(question.options.length)
    );
    const setAnswer = useSessionStore.use.setAnswer();
    const isAnswered = isSkipped || selectedIndex !== null;

    // A question swapped in without a remount renders once before the reset effect runs;
    // fall back to bank order for that frame so no display index can dangle.
    const displayOrder = useMemo(
        () =>
            optionOrder.length === question.options.length
                ? optionOrder
                : question.options.map((_, i) => i),
        [optionOrder, question.options]
    );

    const onSelect = useCallback(
        (displayIndex: number) => {
            if (isAnswered) return;
            const originalIndex = displayOrder[displayIndex];
            if (originalIndex === undefined) return;
            setSelectedIndex(originalIndex);
            setAnswer(question.id, originalIndex);
            track('question_answered', {
                category: question.category,
                difficulty: question.difficulty,
                type: question.type,
                correct: originalIndex === question.correct,
                timeMs: useSessionStore.getState().timerMs
            });
        },
        [isAnswered, question, setAnswer, displayOrder]
    );

    const drawnForId = useRef(question.id);

    // Reset when question changes (navigation forward).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedIndex(null);
        if (drawnForId.current !== question.id) {
            drawnForId.current = question.id;
            setOptionOrder(createOptionOrder(question.options.length));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    useEffect(() => {
        onSelectOptionRegister?.(onSelect);
    }, [onSelect, onSelectOptionRegister]);

    return { selectedIndex, isAnswered, onSelect, displayOrder };
}
