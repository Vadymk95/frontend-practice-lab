import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { RoutesPath } from '@/router/routes';

export const NotFoundPage: FC = () => {
    const { t } = useTranslation('errors');
    const navigate = useNavigate();

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
            <p className="font-mono text-7xl font-bold text-accent">404</p>
            <p className="text-xl font-semibold">{t('page.404')}</p>
            <Button onClick={() => navigate(RoutesPath.Root)} variant="default">
                {t('page.backHome')}
            </Button>
        </div>
    );
};

export default NotFoundPage;
