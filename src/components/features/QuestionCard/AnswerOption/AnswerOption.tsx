import type { FC } from 'react';

import { InlineMarkdown } from '@/components/common/InlineMarkdown';
import { cn } from '@/lib/utils';

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;

interface AnswerOptionProps {
    index: number;
    text: string;
    isSelected: boolean;
    isAnswered: boolean;
    isCorrect: boolean;
    isDisabled: boolean;
    onSelect: () => void;
    variant?: 'radio' | 'checkbox';
    isMissed?: boolean;
    /** The question was skipped: reveal the answer without crediting it as correct. */
    isSkippedReveal?: boolean;
}

export const AnswerOption: FC<AnswerOptionProps> = ({
    index,
    text,
    isSelected,
    isAnswered,
    isCorrect,
    isDisabled,
    onSelect,
    variant = 'radio',
    isMissed = false,
    isSkippedReveal = false
}) => {
    const showSkipped = isSkippedReveal && isAnswered && isCorrect;
    const showCorrect = isAnswered && isCorrect && !isSkippedReveal;
    const showCorrectIcon = isAnswered && isSelected && isCorrect && !isSkippedReveal;
    const showWrong = isAnswered && isSelected && !isCorrect;
    const showMissed = isMissed && !isSelected && !isSkippedReveal;

    return (
        <button
            role={variant}
            aria-checked={isSelected}
            aria-disabled={isDisabled}
            disabled={isDisabled && !showCorrect && !showMissed && !showSkipped}
            onClick={isDisabled ? undefined : onSelect}
            className={cn(
                'flex items-center gap-3 w-full min-h-[52px] px-4 py-3 rounded-lg border text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !isAnswered && !isMissed && 'hover:bg-accent/5 border-border cursor-pointer',
                isSelected && !isAnswered && 'border-primary bg-primary/10',
                showCorrect && 'bg-accent/10 border-accent',
                showWrong && 'bg-error/10 border-error',
                showMissed && 'bg-accent/10 border-accent',
                showSkipped && 'border-warning border-dashed',
                isDisabled &&
                    !showCorrect &&
                    !showMissed &&
                    !showSkipped &&
                    'cursor-not-allowed opacity-60'
            )}
        >
            <span
                className={cn(
                    'shrink-0 w-6 h-6 flex items-center justify-center border text-xs font-medium',
                    // Square reads as "pick several", round as "pick one" — the only pre-tap
                    // signal a sighted user gets, since role=checkbox reaches assistive tech only.
                    variant === 'checkbox' ? 'rounded-sm' : 'rounded-full'
                )}
            >
                {OPTION_KEYS[index]}
            </span>
            <InlineMarkdown text={text} className="flex-1 text-sm" />
            {showCorrectIcon && (
                <span aria-hidden="true" className="text-accent">
                    ✓
                </span>
            )}
            {showWrong && (
                <span aria-hidden="true" className="text-error">
                    ✗
                </span>
            )}
        </button>
    );
};
