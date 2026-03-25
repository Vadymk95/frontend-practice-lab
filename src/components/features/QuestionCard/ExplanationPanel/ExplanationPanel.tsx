import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

interface ExplanationPanelProps {
    explanation: string;
}

export const ExplanationPanel: FC<ExplanationPanelProps> = ({ explanation }) => {
    const { t } = useTranslation('question');
    return (
        <div
            role="complementary"
            aria-label={t('explanation.label')}
            className="mt-2 p-4 rounded-lg bg-muted/50 border border-border animate-in slide-in-from-bottom-2 duration-150"
        >
            <p className="text-xs font-medium text-muted-foreground mb-1">
                {t('explanation.label')}
            </p>
            <p className="text-sm">{explanation}</p>
        </div>
    );
};
