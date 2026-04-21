import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCategories, type ManifestEntry } from '@/hooks/data/useCategories';
import { useCategoryDisplay } from '@/hooks/data/useCategoryDisplay';
import { CategoryFileSchema } from '@/lib/data/schema';
import { useProgressStore, useProgressStoreBase } from '@/store/progress/progressStore';

export interface UseResetWeightsDialogReturn {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    resetAll: () => Promise<void>;
    resetCategory: (slug: string) => Promise<void>;
    categories: ManifestEntry[];
    successMessage: string | null;
}

export const useResetWeightsDialog = (): UseResetWeightsDialogReturn => {
    const { t } = useTranslation('common');
    const getCategoryName = useCategoryDisplay();
    const [isOpen, setIsOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setWeights = useProgressStore.use.setWeights();
    const setErrorRates = useProgressStore.use.setErrorRates();

    const { data: categoriesData } = useCategories();
    const categories: ManifestEntry[] = categoriesData ?? [];

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
        };
    }, []);

    const showSuccess = (message: string) => {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        setSuccessMessage(message);
        timerRef.current = setTimeout(() => {
            setSuccessMessage(null);
            setIsOpen(false);
            timerRef.current = null;
        }, 2000);
    };

    const resetAll = async () => {
        setWeights({});
        setErrorRates({});
        showSuccess(t('resetWeights.successAll'));
    };

    const resetCategory = async (slug: string) => {
        try {
            const res = await fetch(`/data/${slug}.json`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const questions = CategoryFileSchema.parse(await res.json());

            // Read fresh store state to avoid stale closure in async context
            const { weights, errorRates } = useProgressStoreBase.getState();
            const questionIds = new Set(questions.map((q) => q.id));

            const newWeights = Object.fromEntries(
                Object.entries(weights).filter(([id]) => !questionIds.has(id))
            );
            const newErrorRates = Object.fromEntries(
                Object.entries(errorRates).filter(([key]) => key !== slug)
            );

            setWeights(newWeights);
            setErrorRates(newErrorRates);

            const category = categories.find((c) => c.slug === slug);
            showSuccess(
                t('resetWeights.successCategory', {
                    category: getCategoryName(slug, category?.displayName)
                })
            );
        } catch {
            // Store unchanged on fetch/parse failure — no UI feedback needed
        }
    };

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        resetAll,
        resetCategory,
        categories,
        successMessage
    };
};
