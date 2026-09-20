import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCategories } from '@/hooks/data/useCategories';
import { useProgressStoreBase } from '@/store/progress/progressStore';
import { renderWithProviders } from '@/test/test-utils';

import { AlgorithmWidget } from './AlgorithmWidget';

vi.mock('@/hooks/data/useCategories', () => ({
    useCategories: vi.fn()
}));

describe('AlgorithmWidget', () => {
    beforeEach(() => {
        vi.mocked(useCategories).mockReturnValue({
            data: [{ slug: 'javascript', displayName: 'JavaScript' }],
            isLoading: false,
            isError: false
        } as unknown as ReturnType<typeof useCategories>);
        useProgressStoreBase.setState({ errorRates: { javascript: 0.46 } });
    });

    afterEach(() => {
        useProgressStoreBase.setState({ errorRates: {} });
    });

    it('says what the percentage on a weak-topic chip measures', () => {
        renderWithProviders(<AlgorithmWidget onCategorySelect={() => {}} />);

        expect(screen.getByText('46% wrong')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Error rate: 46%/ })).toBeInTheDocument();
    });
});
