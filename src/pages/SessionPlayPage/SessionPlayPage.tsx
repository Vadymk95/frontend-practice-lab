import { LogOut } from 'lucide-react';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/ErrorState';
import { QuestionCard } from '@/components/features/QuestionCard';
import { SessionActionBar } from '@/components/features/SessionActionBar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
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
        isBugFindingPendingSelfAssess,
        multiHasSelection,
        codeCompletionAllFilled,
        bugFindingCanSubmit,
        isEndDialogOpen,
        openEndDialog,
        closeEndDialog,
        confirmEndSession,
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
        : isBugFindingPendingSelfAssess
          ? null
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
            <div className="flex items-center justify-between gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={openEndDialog}
                    className="text-muted-foreground hover:text-destructive"
                >
                    <LogOut size={14} aria-hidden="true" />
                    {tSession('end.button')}
                </Button>
                {timerEnabled && (
                    <span
                        className="text-sm font-mono text-muted-foreground tabular-nums"
                        aria-label={tSession('timer.label')}
                    >
                        {formatTimer(timerMs)}
                    </span>
                )}
            </div>

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

            <Dialog open={isEndDialogOpen} onOpenChange={(open) => !open && closeEndDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tSession('end.dialog.title')}</DialogTitle>
                        <DialogDescription>{tSession('end.dialog.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={closeEndDialog}>
                            {tSession('end.dialog.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={confirmEndSession}>
                            {tSession('end.dialog.confirm')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SessionPlayPage;
