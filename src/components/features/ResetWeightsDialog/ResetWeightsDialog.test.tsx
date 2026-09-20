import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { ResetWeightsDialog } from './ResetWeightsDialog';

vi.mock('@/hooks/data/useCategoryDisplay', () => ({
    useCategoryDisplay: () => (_slug: string, fallback?: string) => fallback ?? _slug
}));

const noop = () => Promise.resolve();

describe('ResetWeightsDialog rendering', () => {
    it('renders category display names with special characters verbatim (no HTML entity leak)', () => {
        renderWithProviders(
            <ResetWeightsDialog
                isOpen
                close={() => {}}
                resetAll={noop}
                resetCategory={noop}
                categories={[
                    { slug: 'ai-llm', displayName: 'AI / LLM', counts: { total: 50 } as never },
                    { slug: 'api-bff', displayName: 'API & BFF', counts: { total: 54 } as never }
                ]}
                successMessage={null}
                errorMessage={null}
            />
        );

        // Visible button labels must contain the raw `/` and `&` — not their
        // HTML-entity equivalents. Regression for the i18next double-escape bug
        // (`escapeValue: true` produced `AI &#x2F; LLM` and `API &amp; BFF`).
        expect(screen.getByRole('button', { name: /Reset: AI \/ LLM/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reset: API & BFF/ })).toBeInTheDocument();
    });
});

const categories = [
    { slug: 'ai-llm', displayName: 'AI / LLM', counts: { total: 50 } as never },
    { slug: 'api-bff', displayName: 'API & BFF', counts: { total: 54 } as never }
];

const renderDialog = (overrides: Partial<Parameters<typeof ResetWeightsDialog>[0]> = {}) =>
    renderWithProviders(
        <ResetWeightsDialog
            isOpen
            close={() => {}}
            resetAll={noop}
            resetCategory={noop}
            categories={categories}
            successMessage={null}
            errorMessage={null}
            isConfirmingAll={false}
            requestResetAll={() => {}}
            cancelResetAll={() => {}}
            {...overrides}
        />
    );

describe('ResetWeightsDialog — destructive actions', () => {
    it('opens with focus on the control that leaves without destroying anything', () => {
        renderDialog();

        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    });

    it('asks before wiping the history of every category', () => {
        const requestResetAll = vi.fn();
        const resetAll = vi.fn(() => Promise.resolve());
        renderDialog({ requestResetAll, resetAll });

        fireEvent.click(screen.getByRole('button', { name: /Reset all weights/ }));

        expect(resetAll).not.toHaveBeenCalled();
        expect(requestResetAll).toHaveBeenCalledOnce();
    });

    it('runs the reset only from the confirmation step', () => {
        const resetAll = vi.fn(() => Promise.resolve());
        renderDialog({ isConfirmingAll: true, resetAll });

        expect(screen.queryByRole('button', { name: /Reset: AI \/ LLM/ })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Yes, reset everything' }));

        expect(resetAll).toHaveBeenCalledOnce();
    });

    it('puts the confirmation step focus on cancelling', () => {
        renderDialog({ isConfirmingAll: true });

        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    });

    it('keeps every reset control tappable at the 44px minimum', () => {
        renderDialog();

        const perCategory = screen.getByRole('button', { name: /Reset: AI \/ LLM/ });
        expect(perCategory.className).toContain('min-h-11');
        expect(screen.getByRole('button', { name: /Reset all weights/ }).className).toContain(
            'min-h-11'
        );
    });

    it('separates the icon from the label on the all-categories reset', () => {
        renderDialog();

        expect(screen.getByRole('button', { name: /Reset all weights/ }).className).toContain(
            'gap-2'
        );
    });
});
