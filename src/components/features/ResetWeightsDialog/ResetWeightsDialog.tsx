import { RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
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
    isConfirmingAll: boolean;
    requestResetAll: () => void;
    cancelResetAll: () => void;
}

export function ResetWeightsDialog({
    isOpen,
    close,
    resetAll,
    resetCategory,
    categories,
    successMessage,
    errorMessage,
    isConfirmingAll,
    requestResetAll,
    cancelResetAll
}: ResetWeightsDialogProps) {
    const { t } = useTranslation('common');
    const getCategoryName = useCategoryDisplay();
    const safeFocusRef = useRef<HTMLButtonElement>(null);

    // Entering the confirmation step swaps the buttons under the user's focus; put it
    // back on the one that walks away, not on the one that destroys the history.
    useEffect(() => {
        if (isConfirmingAll) safeFocusRef.current?.focus();
    }, [isConfirmingAll]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
            <DialogContent
                // Radix focuses the first tabbable node, which is a reset button: one Enter
                // on an unread dialog wiped every category. Focus starts on the way out.
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    safeFocusRef.current?.focus();
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t('resetWeights.title')}</DialogTitle>
                    <DialogDescription>{t('resetWeights.description')}</DialogDescription>
                </DialogHeader>

                {successMessage ? (
                    <p className="py-2 text-center text-sm font-medium text-green-600 dark:text-green-400">
                        {successMessage}
                    </p>
                ) : isConfirmingAll ? (
                    <div className="flex flex-col gap-3">
                        <p role="alert" className="text-sm text-foreground">
                            {t('resetWeights.resetAllConfirm')}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button
                                variant="outline"
                                className="min-h-11"
                                ref={safeFocusRef}
                                onClick={cancelResetAll}
                            >
                                {t('button.cancel')}
                            </Button>
                            <Button variant="destructive" className="min-h-11" onClick={resetAll}>
                                {t('resetWeights.resetAllYes')}
                            </Button>
                        </div>
                    </div>
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

                        <div>
                            <p className="mb-2 text-sm text-muted-foreground">
                                {t('resetWeights.perCategoryLabel')}
                            </p>
                            <ul className="scrollbar-themed flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                                {categories.map((cat) => (
                                    <li key={cat.slug}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="min-h-11 w-full justify-start text-base"
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

                        {/* The widest-reaching action is the least prominent one, and its
                            warning is read before it, not after. */}
                        <div className="flex flex-col gap-2 border-t pt-3">
                            <p className="text-sm text-muted-foreground">
                                {t('resetWeights.resetAllConfirm')}
                            </p>
                            <Button
                                variant="outline"
                                className="min-h-11 w-full gap-2 border-destructive/40 text-destructive"
                                onClick={requestResetAll}
                            >
                                <RotateCcw size={14} aria-hidden="true" />
                                {t('resetWeights.resetAll')}
                            </Button>
                        </div>

                        <DialogClose asChild>
                            <Button variant="ghost" className="min-h-11" ref={safeFocusRef}>
                                {t('button.cancel')}
                            </Button>
                        </DialogClose>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
