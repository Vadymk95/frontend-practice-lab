import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import type { ManifestEntry } from '@/hooks/data/useCategories';
import { useCategoryDisplay } from '@/hooks/data/useCategoryDisplay';

interface ResetWeightsDialogProps {
    isOpen: boolean;
    close: () => void;
    resetAll: () => Promise<void>;
    resetCategory: (slug: string) => Promise<void>;
    categories: ManifestEntry[];
    successMessage: string | null;
    errorMessage: string | null;
}

export function ResetWeightsDialog({
    isOpen,
    close,
    resetAll,
    resetCategory,
    categories,
    successMessage,
    errorMessage
}: ResetWeightsDialogProps) {
    const { t } = useTranslation('common');
    const getCategoryName = useCategoryDisplay();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('resetWeights.title')}</DialogTitle>
                    <DialogDescription>{t('resetWeights.description')}</DialogDescription>
                </DialogHeader>

                {successMessage ? (
                    <p className="py-2 text-center text-sm font-medium text-green-600 dark:text-green-400">
                        {successMessage}
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {errorMessage && (
                            <p
                                role="alert"
                                className="py-1 text-center text-sm font-medium text-error"
                            >
                                {errorMessage}
                            </p>
                        )}
                        <Button variant="destructive" className="w-full" onClick={resetAll}>
                            <RotateCcw size={14} aria-hidden="true" />
                            {t('resetWeights.resetAll')}
                        </Button>

                        <div className="border-t pt-3">
                            <p className="mb-2 text-xs text-muted-foreground">
                                {t('resetWeights.resetAllConfirm')}
                            </p>
                            <ul className="scrollbar-themed flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                                {categories.map((cat) => (
                                    <li key={cat.slug}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={() => resetCategory(cat.slug)}
                                        >
                                            {t('resetWeights.resetCategory', {
                                                category: getCategoryName(cat.slug, cat.displayName)
                                            })}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
