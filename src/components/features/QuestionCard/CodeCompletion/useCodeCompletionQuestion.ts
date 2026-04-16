import { useCallback, useEffect, useMemo, useState } from 'react';

import { track } from '@/lib/analytics';
import type { CodeCompletionQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

interface UseCodeCompletionQuestionProps {
    question: CodeCompletionQuestion;
    isSkipped?: boolean;
    onSubmitRegister: (submitFn: () => void) => void;
    onAllBlanksFilled: (filled: boolean) => void;
}

interface UseCodeCompletionQuestionReturn {
    segments: string[];
    blanksInput: string[];
    isSubmitted: boolean;
    blankResults: Array<'correct' | 'incorrect'>;
    onBlankChange: (index: number, value: string) => void;
    onSubmit: () => void;
}

export function useCodeCompletionQuestion({
    question,
    isSkipped = false,
    onSubmitRegister,
    onAllBlanksFilled
}: UseCodeCompletionQuestionProps): UseCodeCompletionQuestionReturn {
    const [_blanksInput, setBlanksInput] = useState<string[]>(() =>
        Array(question.blanks.length).fill('')
    );
    const [_isSubmitted, setIsSubmitted] = useState(false);
    const [_blankResults, setBlankResults] = useState<Array<'correct' | 'incorrect'>>([]);
    const blanksInput = useMemo(
        () => (isSkipped ? [...question.blanks] : _blanksInput),
        [isSkipped, question.blanks, _blanksInput]
    );
    const isSubmitted = isSkipped || _isSubmitted;
    const blankResults = isSkipped ? question.blanks.map(() => 'correct' as const) : _blankResults;

    const segments = useMemo(() => question.code.split('__BLANK__'), [question.code]);

    if (import.meta.env.DEV && segments.length - 1 !== question.blanks.length) {
        console.warn(
            `[CodeCompletionQuestion] Blank count mismatch: ${segments.length - 1} __BLANK__ in code vs ${question.blanks.length} in schema (id: "${question.id}")`
        );
    }

    const setAnswer = useSessionStore.use.setAnswer();

    const onBlankChange = useCallback((index: number, value: string) => {
        setBlanksInput((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, []);

    useEffect(() => {
        const allFilled = blanksInput.length > 0 && blanksInput.every((v) => v.trim() !== '');
        onAllBlanksFilled(allFilled);
    }, [blanksInput, onAllBlanksFilled]);

    const onSubmit = useCallback(() => {
        if (isSubmitted) return;
        if (!blanksInput.every((v) => v.trim() !== '')) return;

        const results = question.blanks.map((expected, i) =>
            blanksInput[i].trim().toLowerCase() === expected.trim().toLowerCase()
                ? ('correct' as const)
                : ('incorrect' as const)
        );
        const allCorrect = results.every((r) => r === 'correct');
        setBlankResults(results);
        setIsSubmitted(true);
        setAnswer(question.id, allCorrect ? 'correct' : 'incorrect');
        track('question_answered', {
            category: question.category,
            difficulty: question.difficulty,
            type: question.type,
            correct: allCorrect,
            timeMs: useSessionStore.getState().timerMs
        });
    }, [isSubmitted, blanksInput, question, setAnswer]);

    useEffect(() => {
        onSubmitRegister(onSubmit);
    }, [onSubmit, onSubmitRegister]);

    useEffect(() => {
        setBlanksInput(Array(question.blanks.length).fill(''));
        setIsSubmitted(false);
        setBlankResults([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    return { segments, blanksInput, isSubmitted, blankResults, onBlankChange, onSubmit };
}
