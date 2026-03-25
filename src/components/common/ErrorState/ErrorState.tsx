import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export const ErrorState: FC<ErrorStateProps> = ({ message, onRetry }) => {
    const { t } = useTranslation('errors');
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
            <p className="text-error text-base">{message ?? t('generic')}</p>
            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    {t('retry')}
                </Button>
            )}
        </div>
    );
};
