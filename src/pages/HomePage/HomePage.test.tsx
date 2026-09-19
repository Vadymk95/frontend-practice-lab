import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCategories } from '@/hooks/data/useCategories';
import { axe } from '@/test/a11y';
import { renderWithProviders } from '@/test/test-utils';

import { HomePage } from './index';

vi.mock('@/hooks/data/useCategories', () => ({
    useCategories: vi.fn()
}));

const refetch = vi.fn();

const mockCategories = (overrides: Record<string, unknown> = {}) => {
    vi.mocked(useCategories).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch,
        ...overrides
    } as unknown as ReturnType<typeof useCategories>);
};

describe('HomePage', () => {
    beforeEach(() => {
        refetch.mockReset();
        mockCategories();
    });

    it('renders SessionConfigurator hint when no categories selected', () => {
        renderWithProviders(<HomePage />);
        expect(screen.getByText(/select at least one category/i)).toBeInTheDocument();
    });

    it('renders Start Session button disabled initially', () => {
        renderWithProviders(<HomePage />);
        const buttons = screen.getAllByRole('button', { name: /start session/i });
        buttons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it('opens with the product name as the page heading', () => {
        renderWithProviders(<HomePage />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('InterviewOS');
    });

    it('says what the app is before the category grid', () => {
        renderWithProviders(<HomePage />);
        expect(screen.getByText(/pick your topics/i)).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
        const { container } = renderWithProviders(<HomePage />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('surfaces a failed manifest load instead of an empty configurator', () => {
        mockCategories({ data: undefined, isError: true, error: new Error('boom') });

        renderWithProviders(<HomePage />);

        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.queryByText(/select at least one category/i)).not.toBeInTheDocument();
    });

    it('retries the manifest load from the error state', () => {
        mockCategories({ data: undefined, isError: true, error: new Error('boom') });

        renderWithProviders(<HomePage />);
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));

        expect(refetch).toHaveBeenCalled();
    });
});
