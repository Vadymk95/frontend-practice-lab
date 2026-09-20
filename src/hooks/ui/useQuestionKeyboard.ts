import { useEffect, useRef } from 'react';

// Min interval between Enter-driven submits. Guards against stuck-key autorepeat
// and React-render-race where rapid Enters cross Submit → Next on the same keystroke.
const ENTER_DEBOUNCE_MS = 250;

// Options are labelled A-E on screen, so the printed letter has to select the option
// it labels; the digits stay supported because they always were.
const OPTION_LETTERS = 'abcde';

// Enter activates whatever control the user has focused. Swallowing it here cancelled
// that native activation, leaving the persistent controls dead to the key.
const INTERACTIVE_SELECTOR = 'button, a[href], select, [role="button"]';

/** Zero-based option index a shortcut key points at, or null when the key is not a shortcut. */
function optionIndexFromKey(key: string, optionCount: number): number | null {
    if (key.length !== 1) return null;

    const digit = Number(key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= optionCount) return digit - 1;

    const letterIndex = OPTION_LETTERS.indexOf(key.toLowerCase());
    return letterIndex !== -1 && letterIndex < optionCount ? letterIndex : null;
}

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

            // A modifier turns a shortcut key into a browser command (select all, tab switch).
            const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
            if (!isAnswered && !hasModifier) {
                const optionIndex = optionIndexFromKey(e.key, optionCount);
                if (optionIndex !== null) {
                    e.preventDefault();
                    onSelectOption(optionIndex);
                }
            }

            if (e.key === 'Enter') {
                if (e.target instanceof Element && e.target.closest(INTERACTIVE_SELECTOR)) return;
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
