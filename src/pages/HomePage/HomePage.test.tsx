import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
        renderWithProviders(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );
        expect(screen.getByText(/select at least one category/i)).toBeInTheDocument();
    });

    it('renders Start Session button disabled initially', () => {
        renderWithProviders(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );
        const buttons = screen.getAllByRole('button', { name: /start session/i });
        buttons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it('has no accessibility violations', async () => {
        const { container } = renderWithProviders(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});
