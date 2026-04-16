import { type FC, type ReactNode, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

interface WithSuspenseOptions {
    showLoader?: boolean;
}

const LoadingFallback: FC = () => {
    const { t } = useTranslation('common');
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex min-h-[200px] items-center justify-center"
        >
            <span className="text-sm text-muted-foreground">{t('loading')}</span>
        </div>
    );
};

export const WithSuspense = (
    element: ReactNode,
    options: WithSuspenseOptions = { showLoader: true }
) => <Suspense fallback={options.showLoader ? <LoadingFallback /> : null}>{element}</Suspense>;
