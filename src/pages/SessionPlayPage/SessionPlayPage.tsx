import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/ErrorState';
import { QuestionCard } from '@/components/features/QuestionCard';
import { Button } from '@/components/ui/button';

import { useSessionPlayPage } from './useSessionPlayPage';

export const SessionPlayPage: FC = () => {
    const { t: tSession } = useTranslation('session');
    const { t: tQuestion } = useTranslation('question');
    const {
        isSetupLoading,
        isSetupError,
        questionCount,
        currentQuestion,
        isAnswered,
        handleNext,
        onRetry
    } = useSessionPlayPage();

    const [multiHasSelection, setMultiHasSelection] = useState(false);
    const checkFnRef = useRef<(() => void) | null>(null);

    const handleSelectionChange = useCallback((hasSelection: boolean) => {
        setMultiHasSelection(hasSelection);
    }, []);

    const handleCheckRegister = useCallback((checkFn: () => void) => {
        checkFnRef.current = checkFn;
    }, []);

    const handleCheck = useCallback(() => {
        checkFnRef.current?.();
    }, []);

    useEffect(() => {
        setMultiHasSelection(false);
        checkFnRef.current = null;
    }, [currentQuestion?.id]);

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

    const isMultiChoice = currentQuestion?.type === 'multi-choice';

    return (
        <div className="flex flex-col gap-4 pb-24 lg:pb-0">
            <QuestionCard
                onSelectionChange={handleSelectionChange}
                onCheckRegister={handleCheckRegister}
            />

            {/* Desktop inline — Check button (multi-choice, not yet answered) */}
            {isMultiChoice && !isAnswered && (
                <div className="hidden lg:flex justify-end mt-2">
                    <Button disabled={!multiHasSelection} onClick={handleCheck}>
                        {tQuestion('check')}
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
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
                    <Button disabled={!multiHasSelection} onClick={handleCheck} className="w-full">
                        {tQuestion('check')}
                    </Button>
                </div>
            )}

            {/* Mobile sticky — Next button (answered) */}
            {isAnswered && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
                    <Button onClick={handleNext} className="w-full">
                        {tSession('next')}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default SessionPlayPage;
