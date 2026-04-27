import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useCategoryDisplay } from '@/hooks/data/useCategoryDisplay';

import { useAlgorithmWidget } from './useAlgorithmWidget';

interface AlgorithmWidgetProps {
    onCategorySelect: (slug: string) => void;
}

export const AlgorithmWidget: FC<AlgorithmWidgetProps> = ({ onCategorySelect }) => {
    const { t } = useTranslation('home');
    const getCategoryName = useCategoryDisplay();
    const { topWeakCategories, hasData } = useAlgorithmWidget();

    if (!hasData) return null;

    return (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-3">{t('algorithmWidget.title')}</p>
            <div className="flex flex-wrap gap-2">
                {topWeakCategories.map((cat) => {
                    const name = getCategoryName(cat.slug, cat.displayName);
                    return (
                        <button
                            key={cat.slug}
                            type="button"
                            onClick={() => onCategorySelect(cat.slug)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-sm hover:bg-muted transition-colors max-w-full"
                            aria-label={`${name} ${Math.round(cat.errorRate * 100)}%`}
                        >
                            <span className="min-w-0 wrap-break-words leading-tight">{name}</span>
                            <span className="text-[11px] text-destructive font-medium shrink-0">
                                {Math.round(cat.errorRate * 100)}%
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('algorithmWidget.tapToSelect')}</p>
        </div>
    );
};
