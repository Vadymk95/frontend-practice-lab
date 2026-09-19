import { useEffect, useRef } from 'react';

// Min interval between Enter-driven submits. Guards against stuck-key autorepeat
// and React-render-race where rapid Enters cross Submit → Next on the same keystroke.
const ENTER_DEBOUNCE_MS = 250;

interface UseQuestionKeyboardProps {
    optionCount: number;
    onSelectOption: (idx: number) => void;
    onSubmit: () => void;
    isAnswered: boolean;
    /** Caller-owned off switch — false while a modal owns the keyboard. Defaults to true. */
    enabled?: boolean;
}

export const useQuestionKeyboard = ({
    optionCount,
    onSelectOption,
    onSubmit,
    isAnswered,
    enabled = true
}: UseQuestionKeyboardProps): void => {
    const lastEnterAtRef = useRef(0);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            // Dialogs are portaled out of the page subtree, so Enter on their Cancel
            // button would otherwise reach this document-level listener first and
            // advance the question underneath before the button click closes them.
            if (e.target instanceof Element && e.target.closest('[role="dialog"]')) return;

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
    }, [optionCount, onSelectOption, onSubmit, isAnswered, enabled]);
};
