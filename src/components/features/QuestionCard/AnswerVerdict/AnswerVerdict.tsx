import type { FC } from 'react';

import { cn } from '@/lib/utils';

interface AnswerVerdictProps {
    /** `null` until the question is graded — the region stays mounted so it can announce. */
    status: 'correct' | 'incorrect' | null;
    label: string;
}

/**
 * The one line that says whether the answer was right. Colour on the options alone cannot
 * carry that: a correct option the reader never picked is green too, which reads as a win.
 */
export const AnswerVerdict: FC<AnswerVerdictProps> = ({ status, label }) => (
    <div role="status" aria-live="polite" aria-atomic="true">
        {status !== null && (
            <p
                className={cn(
                    'flex items-center gap-2 text-base font-medium',
                    status === 'correct' ? 'text-accent' : 'text-error'
                )}
            >
                <span aria-hidden="true">{status === 'correct' ? '✓' : '✗'}</span>
                <span>{label}</span>
            </p>
        )}
    </div>
);
