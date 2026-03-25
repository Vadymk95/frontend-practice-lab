import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/ErrorState';
import { QuestionCard } from '@/components/features/QuestionCard';
import { Button } from '@/components/ui/button';

import { useSessionPlayPage } from './useSessionPlayPage';

export const SessionPlayPage: FC = () => {
    const { t } = useTranslation('session');
    const { isSetupLoading, isSetupError, questionCount, isAnswered, handleNext, onRetry } =
        useSessionPlayPage();

    if (isSetupError) {
        return <ErrorState message={t('errors.fetchQuestions')} onRetry={onRetry} />;
    }

    if (isSetupLoading || questionCount === 0) {
        return (
            <div role="status" aria-live="polite" className="flex justify-center py-12">
                <span className="text-muted-foreground text-sm">{t('loading')}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-24 lg:pb-0">
            <QuestionCard />
            {/* Desktop inline */}
            {isAnswered && (
                <div className="hidden lg:flex justify-end mt-2">
                    <Button onClick={handleNext}>{t('next')}</Button>
                </div>
            )}
            {/* Mobile sticky bottom bar */}
            {isAnswered && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
                    <Button onClick={handleNext} className="w-full">
                        {t('next')}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default SessionPlayPage;
