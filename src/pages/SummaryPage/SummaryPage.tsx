import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

export const SummaryPage: FC = () => {
    const { t } = useTranslation('common');
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground text-sm">
                {t('comingSoon', 'Summary coming in Story 1.6')}
            </p>
        </div>
    );
};

export default SummaryPage;
