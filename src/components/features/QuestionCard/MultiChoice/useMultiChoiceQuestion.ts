import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { track } from '@/lib/analytics';
import type { MultiChoiceQuestion } from '@/lib/data/schema';
import { createOptionOrder } from '@/lib/utils/optionOrder';
import { useSessionStore } from '@/store/session';

export function useMultiChoiceQuestion(
    question: MultiChoiceQuestion,
    isSkipped: boolean,
    onSelectionChange: (hasSelection: boolean) => void,
    onCheckRegister: (checkFn: () => void) => void,
    onSelectOptionRegister?: (fn: (idx: number) => void) => void
) {
    const [_selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [_isChecked, setIsChecked] = useState(false);
    // One draw per question — see createOptionOrder for why the bank order is not shown as-is.
    const [optionOrder, setOptionOrder] = useState(() =>
        createOptionOrder(question.options.length)
    );
    const selectedIndices = isSkipped ? question.correct : _selectedIndices;
    const isChecked = isSkipped || _isChecked;
    const setAnswer = useSessionStore.use.setAnswer();

    // A question swapped in without a remount renders once before the reset effect runs;
    // fall back to bank order for that frame so no display index can dangle.
    const displayOrder = useMemo(
        () =>
            optionOrder.length === question.options.length
                ? optionOrder
                : question.options.map((_, i) => i),
        [optionOrder, question.options]
    );

    // Track whether onSelectionChange has been called for current indices to avoid
    // calling parent setState inside a child setState updater (React warning).
    const prevSelectionRef = useRef(false);
    useEffect(() => {
        const hasSelection = _selectedIndices.length > 0;
        if (prevSelectionRef.current !== hasSelection) {
            prevSelectionRef.current = hasSelection;
            onSelectionChange(hasSelection);
        }
    }, [_selectedIndices, onSelectionChange]);

    const onToggle = useCallback(
        (displayIndex: number) => {
            if (isChecked) return;
            const originalIndex = displayOrder[displayIndex];
            if (originalIndex === undefined) return;
            setSelectedIndices((prev) =>
                prev.includes(originalIndex)
                    ? prev.filter((i) => i !== originalIndex)
                    : [...prev, originalIndex]
            );
        },
        [isChecked, displayOrder]
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

    useEffect(() => {
        onSelectOptionRegister?.(onToggle);
    }, [onToggle, onSelectOptionRegister]);

    const drawnForId = useRef(question.id);

    // Reset state when question changes
    useEffect(() => {
        setSelectedIndices([]);
        setIsChecked(false);
        prevSelectionRef.current = false;
        onSelectionChange(false);
        if (drawnForId.current !== question.id) {
            drawnForId.current = question.id;
            setOptionOrder(createOptionOrder(question.options.length));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    return { selectedIndices, isChecked, onToggle, displayOrder };
}
