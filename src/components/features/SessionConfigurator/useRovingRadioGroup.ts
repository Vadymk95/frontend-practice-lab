import { useRef } from 'react';
import type { KeyboardEvent, Ref } from 'react';

const STEP_BY_KEY = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1
} as const;

type StepKey = keyof typeof STEP_BY_KEY;

const isStepKey = (key: string): key is StepKey => key in STEP_BY_KEY;

export interface RovingRadioProps {
    tabIndex: number;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
    ref: Ref<HTMLButtonElement>;
}

/**
 * ARIA radiogroup keyboard behaviour for a group of `role="radio"` buttons:
 * one tab stop (the checked option), arrows move the selection and the focus with
 * wrap-around, Home/End jump to the ends. Radios that each carry tabIndex 0 and
 * ignore the arrow keys advertise a pattern they do not implement.
 */
export const useRovingRadioGroup = <T extends string>(
    options: readonly T[],
    value: T,
    onChange: (next: T) => void
) => {
    const nodes = useRef(new Map<T, HTMLButtonElement>());

    const selectAt = (index: number) => {
        const next = options[index];
        if (next === undefined || next === value) return;
        onChange(next);
        nodes.current.get(next)?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const current = options.indexOf(value);
        const from = current === -1 ? 0 : current;

        if (isStepKey(event.key)) {
            event.preventDefault();
            selectAt((from + STEP_BY_KEY[event.key] + options.length) % options.length);
            return;
        }
        if (event.key === 'Home') {
            event.preventDefault();
            selectAt(0);
            return;
        }
        if (event.key === 'End') {
            event.preventDefault();
            selectAt(options.length - 1);
        }
    };

    return (option: T): RovingRadioProps => ({
        tabIndex: option === value ? 0 : -1,
        onKeyDown: handleKeyDown,
        ref: (node) => {
            if (node) {
                nodes.current.set(option, node);
            } else {
                nodes.current.delete(option);
            }
        }
    });
};
