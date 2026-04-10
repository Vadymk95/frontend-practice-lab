import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useAlgorithmWidget } from './useAlgorithmWidget';

interface AlgorithmWidgetProps {
    onCategorySelect: (slug: string) => void;
}

export const AlgorithmWidget: FC<AlgorithmWidgetProps> = ({ onCategorySelect }) => {
    const { t } = useTranslation('home');
    const { topWeakCategories, hasData } = useAlgorithmWidget();

    if (!hasData) return null;

    return (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-3">{t('algorithmWidget.title')}</p>
            <div className="flex flex-wrap gap-2">
                {topWeakCategories.map((cat) => (
                    <button
                        key={cat.slug}
                        type="button"
                        onClick={() => onCategorySelect(cat.slug)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-sm hover:bg-muted transition-colors"
                        aria-label={`${cat.displayName} ${Math.round(cat.errorRate * 100)}%`}
                    >
                        <span>{cat.displayName}</span>
                        <span className="text-[11px] text-destructive font-medium">
                            {Math.round(cat.errorRate * 100)}%
                        </span>
                    </button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('algorithmWidget.tapToSelect')}</p>
        </div>
    );
};
