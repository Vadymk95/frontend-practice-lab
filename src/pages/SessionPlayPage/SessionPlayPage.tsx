import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/ErrorState';
import { QuestionCard } from '@/components/features/QuestionCard';
import { Button } from '@/components/ui/button';
import { formatTimer } from '@/lib/utils/formatTimer';

import { useSessionPlayPage } from './useSessionPlayPage';

export const SessionPlayPage: FC = () => {
    const { t: tSession } = useTranslation('session');
    const { t: tQuestion } = useTranslation('question');
    const {
        isSetupLoading,
        isSetupError,
        questionCount,
        isAnswered,
        timerEnabled,
        timerMs,
        isMultiChoice,
        isCodeCompletion,
        isBugFinding,
        multiHasSelection,
        codeCompletionAllFilled,
        bugFindingCanSubmit,
        handleNext,
        handleCheck,
        handleSubmit,
        onRetry,
        onSelectionChange,
        onCheckRegister,
        onSubmitRegister,
        onAllBlanksFilled,
        onBugFindingCanSubmit,
        onSelectOptionRegister
    } = useSessionPlayPage();

    if (isSetupError) {
        return <ErrorState message={tSession('errors.fetchQuestions')} onRetry={onRetry} />;
    }

    if (isSetupLoading || questionCount === 0) {
        return (
            <div role="status" aria-live="polite" className="flex justify-center py-12">
                <span className="text-muted-foreground text-sm">{tSession('loading')}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-24 lg:pb-0">
            {timerEnabled && (
                <div className="flex justify-end">
                    <span
                        className="text-sm font-mono text-muted-foreground tabular-nums"
                        aria-label={tSession('timer.label')}
                    >
                        {formatTimer(timerMs)}
                    </span>
                </div>
            )}

            <QuestionCard
                onSelectionChange={onSelectionChange}
                onCheckRegister={onCheckRegister}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={onAllBlanksFilled}
                onBugFindingCanSubmit={onBugFindingCanSubmit}
                onSelectOptionRegister={onSelectOptionRegister}
            />

            {/* Desktop inline — Check button (multi-choice, not yet answered) */}
            {isMultiChoice && !isAnswered && (
                <div className="hidden lg:flex justify-end mt-2">
                    <Button disabled={!multiHasSelection} onClick={handleCheck}>
                        {tQuestion('check')}
                    </Button>
                </div>
            )}

            {/* Desktop inline — Submit button (code-completion, not yet answered) */}
            {isCodeCompletion && !isAnswered && (
                <div className="hidden lg:flex justify-end mt-2">
                    <Button disabled={!codeCompletionAllFilled} onClick={handleSubmit}>
                        {tQuestion('submit')}
                    </Button>
                </div>
            )}

            {/* Desktop inline — Submit button (bug-finding, not yet answered) */}
            {isBugFinding && !isAnswered && (
                <div className="hidden lg:flex justify-end mt-2">
                    <Button disabled={!bugFindingCanSubmit} onClick={handleSubmit}>
                        {tQuestion('submit')}
                    </Button>
                </div>
            )}

            {/* Desktop inline — Next button (answered) */}
            {isAnswered && (
                <div className="hidden lg:flex justify-end mt-2">
                    <Button onClick={handleNext}>{tSession('next')}</Button>
                </div>
            )}

            {/* Mobile sticky — Check button (multi-choice, not yet answered) */}
            {isMultiChoice && !isAnswered && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Button disabled={!multiHasSelection} onClick={handleCheck} className="w-full">
                        {tQuestion('check')}
                    </Button>
                </div>
            )}

            {/* Mobile sticky — Submit button (code-completion, not yet answered) */}
            {isCodeCompletion && !isAnswered && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Button
                        disabled={!codeCompletionAllFilled}
                        onClick={handleSubmit}
                        className="w-full"
                    >
                        {tQuestion('submit')}
                    </Button>
                </div>
            )}

            {/* Mobile sticky — Submit button (bug-finding, not yet answered) */}
            {isBugFinding && !isAnswered && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Button
                        disabled={!bugFindingCanSubmit}
                        onClick={handleSubmit}
                        className="w-full"
                    >
                        {tQuestion('submit')}
                    </Button>
                </div>
            )}

            {/* Mobile sticky — Next button (answered) */}
            {isAnswered && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Button onClick={handleNext} className="w-full">
                        {tSession('next')}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default SessionPlayPage;
