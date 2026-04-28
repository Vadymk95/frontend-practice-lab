import { useEffect, useRef } from 'react';

// Min interval between Enter-driven submits. Guards against stuck-key autorepeat
// and React-render-race where rapid Enters cross Submit → Next on the same keystroke.
const ENTER_DEBOUNCE_MS = 250;

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
    const lastEnterAtRef = useRef(0);

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
                const now = Date.now();
                if (now - lastEnterAtRef.current < ENTER_DEBOUNCE_MS) return;
                lastEnterAtRef.current = now;
                e.preventDefault();
                onSubmit();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [optionCount, onSelectOption, onSubmit, isAnswered]);
};
