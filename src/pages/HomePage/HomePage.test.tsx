import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { axe } from '@/test/a11y';
import { renderWithProviders } from '@/test/test-utils';

import { HomePage } from './index';

vi.mock('@/hooks/data/useCategories', () => ({
    useCategories: vi.fn().mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null
    })
}));

describe('HomePage', () => {
    it('renders SessionConfigurator hint when no categories selected', () => {
        renderWithProviders(<HomePage />);
        expect(screen.getByText(/select at least one category/i)).toBeInTheDocument();
    });

    it('renders Start Session button disabled initially', () => {
        renderWithProviders(<HomePage />);
        const buttons = screen.getAllByRole('button', { name: /start session/i });
        buttons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it('has no accessibility violations', async () => {
        const { container } = renderWithProviders(<HomePage />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});
