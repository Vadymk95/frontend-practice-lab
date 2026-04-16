import { useEffect } from 'react';

interface UseQuestionKeyboardProps {
    optionCount: number;
    onSelectOption: (idx: number) => void;
    onSubmit: () => void;
    isAnswered: boolean;
}

export const useQuestionKeyboard = ({
    optionCount,
    onSelectOption,
    onSubmit,
    isAnswered
}: UseQuestionKeyboardProps): void => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;

            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= optionCount && !isAnswered) {
                e.preventDefault();
                onSelectOption(num - 1);
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [optionCount, onSelectOption, onSubmit, isAnswered]);
};
