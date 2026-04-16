import { useCallback, useEffect, useState } from 'react';

import { track } from '@/lib/analytics';
import type { BugFindingQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

type SelfAssessment = 'gotIt' | 'missedIt';

interface UseBugFindingQuestionProps {
    question: BugFindingQuestion;
    isSkipped?: boolean;
    onSubmitRegister: (submitFn: () => void) => void;
    onSelfAssessRegister: (selfAssessFn: (result: SelfAssessment) => void) => void;
}

interface UseBugFindingQuestionReturn {
    selectedOption: number | null;
    textAnswer: string;
    isSubmitted: boolean;
    selfAssessment: SelfAssessment | null;
    onSelectOption: (index: number) => void;
    onTextChange: (value: string) => void;
    onSubmit: () => void;
    onSelfAssess: (result: SelfAssessment) => void;
}

export function useBugFindingQuestion({
    question,
    isSkipped = false,
    onSubmitRegister,
    onSelfAssessRegister
}: UseBugFindingQuestionProps): UseBugFindingQuestionReturn {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [_isSubmitted, setIsSubmitted] = useState(false);
    const [_selfAssessment, setSelfAssessment] = useState<SelfAssessment | null>(null);
    const isSubmitted = isSkipped || _isSubmitted;
    const selfAssessment: SelfAssessment | null =
        isSkipped && _selfAssessment === null ? 'missedIt' : _selfAssessment;
    const setAnswer = useSessionStore.use.setAnswer();

    const onSelectOption = useCallback(
        (index: number) => {
            if (isSubmitted) return;
            setSelectedOption(index);
        },
        [isSubmitted]
    );

    const onTextChange = useCallback(
        (value: string) => {
            if (isSubmitted) return;
            setTextAnswer(value);
        },
        [isSubmitted]
    );

    const onSubmit = useCallback(() => {
        if (isSubmitted) return;
        if (question.options) {
            if (selectedOption === null) return;
        } else {
            if (!textAnswer.trim()) return;
        }
        setIsSubmitted(true);
        const rawAnswer = question.options ? question.options[selectedOption!] : textAnswer.trim();
        setAnswer(question.id, rawAnswer);
    }, [isSubmitted, question, selectedOption, textAnswer, setAnswer]);

    const onSelfAssess = useCallback(
        (result: SelfAssessment) => {
            if (selfAssessment !== null) return;
            setSelfAssessment(result);
            setAnswer(question.id, result);
            track('question_answered', {
                category: question.category,
                difficulty: question.difficulty,
                type: question.type,
                correct: result === 'gotIt',
                timeMs: useSessionStore.getState().timerMs
            });
        },
        [selfAssessment, setAnswer, question]
    );

    useEffect(() => {
        onSubmitRegister(onSubmit);
    }, [onSubmit, onSubmitRegister]);

    useEffect(() => {
        onSelfAssessRegister(onSelfAssess);
    }, [onSelfAssess, onSelfAssessRegister]);

    useEffect(() => {
        setSelectedOption(null);
        setTextAnswer('');
        setIsSubmitted(false);
        setSelfAssessment(null);
    }, [question.id]);

    return {
        selectedOption,
        textAnswer,
        isSubmitted,
        selfAssessment,
        onSelectOption,
        onTextChange,
        onSubmit,
        onSelfAssess
    };
}
