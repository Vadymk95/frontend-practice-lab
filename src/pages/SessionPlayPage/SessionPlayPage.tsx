import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/ErrorState';
import { QuestionCard } from '@/components/features/QuestionCard';
import { SessionActionBar } from '@/components/features/SessionActionBar';
import { formatTimer } from '@/lib/utils/formatTimer';

import { useSessionPlayPage } from './useSessionPlayPage';

interface ActionBarState {
    label: string;
    onClick: () => void;
    disabled: boolean;
}

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

    const actionBar: ActionBarState | null = isAnswered
        ? { label: tSession('next'), onClick: handleNext, disabled: false }
        : isMultiChoice
          ? { label: tQuestion('check'), onClick: handleCheck, disabled: !multiHasSelection }
          : isCodeCompletion
            ? {
                  label: tQuestion('submit'),
                  onClick: handleSubmit,
                  disabled: !codeCompletionAllFilled
              }
            : isBugFinding
              ? {
                    label: tQuestion('submit'),
                    onClick: handleSubmit,
                    disabled: !bugFindingCanSubmit
                }
              : null;

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

            {actionBar && (
                <SessionActionBar
                    label={actionBar.label}
                    onClick={actionBar.onClick}
                    disabled={actionBar.disabled}
                />
            )}
        </div>
    );
};

export default SessionPlayPage;
