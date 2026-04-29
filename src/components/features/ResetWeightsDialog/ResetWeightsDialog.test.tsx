import { screen } from '@testing-library/react';
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
        expect(screen.getByRole('button', { name: /Reset AI \/ LLM/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reset API & BFF/ })).toBeInTheDocument();
    });
});
