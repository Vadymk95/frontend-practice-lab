import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { InlineMarkdown } from '@/components/common/InlineMarkdown';
import { cn } from '@/lib/utils';

// Seven options is the widest question in the bank; the numeric fallback keeps the badge
// labelled if a wider one is ever authored, because an empty badge has no accessible name.
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

const optionKey = (index: number): string => OPTION_KEYS[index] ?? String(index + 1);

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
    const { t } = useTranslation('question');
    const showSkipped = isSkippedReveal && isAnswered && isCorrect;
    const showCorrect = isAnswered && isCorrect && !isSkippedReveal;
    const showWrong = isAnswered && isSelected && !isCorrect;
    const showMissed = isMissed && !isSelected && !isSkippedReveal;

    // Which of the three post-answer states this option is in, said in words. Colour alone
    // cannot tell "the answer you picked" from "the answer you did not pick" — both are green.
    const mark = showSkipped
        ? t('marks.correctAnswer')
        : isAnswered && isSelected
          ? t('marks.yourAnswer')
          : showCorrect
            ? t('marks.missedCorrect')
            : null;

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
                {optionKey(index)}
            </span>
            <InlineMarkdown text={text} className="flex-1 text-base" />
            {mark !== null && (
                <span className="shrink-0 text-xs text-muted-foreground">{mark}</span>
            )}
            {showCorrect && (
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
