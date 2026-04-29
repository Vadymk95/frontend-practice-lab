import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import type { SessionPreset } from '@/lib/storage/types';

import { usePresetRow } from './usePresetRow';

interface PresetRowProps {
    preset: SessionPreset;
}

export const PresetRow: FC<PresetRowProps> = ({ preset }) => {
    const { t } = useTranslation('home');
    const {
        handleLaunch,
        isDeleteOpen,
        handleDialogOpenChange,
        handleDeleteRequest,
        handleDeleteConfirm,
        handleDeleteCancel
    } = usePresetRow(preset);

    // Freeze "now" at mount so the render is pure. Days-ago granularity is fine
    // even across long sessions — the row remounts when presets re-load.
    const [nowMs] = useState(() => Date.now());

    const relativeDate = (() => {
        const ms = new Date(preset.lastUsedAt).getTime();
        if (isNaN(ms)) return '';
        const days = Math.max(0, Math.floor((nowMs - ms) / 86_400_000));
        if (days === 0) return t('preset.lastUsed.today');
        if (days === 1) return t('preset.lastUsed.yesterday');
        return t('preset.lastUsed.daysAgo', { count: days });
    })();

    return (
        <>
            <div className="w-full flex items-center border border-border bg-surface hover:border-accent-alt/50 transition-colors">
                <button
                    type="button"
                    aria-label={preset.name}
                    onClick={handleLaunch}
                    className="flex-1 text-left px-4 py-3"
                >
                    <div className="text-sm font-medium text-foreground">{preset.name}</div>
                    {relativeDate && (
                        <div className="text-xs text-muted-foreground mt-0.5">{relativeDate}</div>
                    )}
                </button>
                <button
                    type="button"
                    aria-label={`${t('presets.deleteDialog.confirm')} ${preset.name}`}
                    onClick={handleDeleteRequest}
                    className="px-3 py-3 text-muted-foreground hover:text-destructive transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                </button>
            </div>

            <Dialog open={isDeleteOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('presets.deleteDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('presets.deleteDialog.description', { name: preset.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleDeleteCancel}>
                            {t('presets.deleteDialog.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>
                            {t('presets.deleteDialog.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
