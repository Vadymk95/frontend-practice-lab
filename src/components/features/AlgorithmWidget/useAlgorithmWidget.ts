import { useMemo } from 'react';

import { useCategories } from '@/hooks/data/useCategories';
import { useProgressStore } from '@/store/progress';

export interface WeakCategory {
    slug: string;
    displayName: string;
    errorRate: number;
}

export interface UseAlgorithmWidgetReturn {
    topWeakCategories: WeakCategory[];
    hasData: boolean;
}

export function useAlgorithmWidget(): UseAlgorithmWidgetReturn {
    const errorRates = useProgressStore.use.errorRates();
    const { data: categories } = useCategories();

    const topWeakCategories = useMemo(() => {
        if (!categories) return [];
        return categories
            .filter((cat) => (errorRates[cat.slug] ?? 0) > 0)
            .map((cat) => ({
                slug: cat.slug,
                displayName: cat.displayName,
                errorRate: errorRates[cat.slug] ?? 0
            }))
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, 3);
    }, [categories, errorRates]);

    const hasData = topWeakCategories.length > 0;

    return { topWeakCategories, hasData };
}
