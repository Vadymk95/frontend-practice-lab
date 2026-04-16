import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { axe } from '@/test/a11y';
import { renderWithProviders } from '@/test/test-utils';

import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
    it('renders the logo with brand text', () => {
        renderWithProviders(<AppHeader />);
        expect(screen.getByText('InterviewOS')).toBeInTheDocument();
    });

    it('renders a language toggle button', () => {
        renderWithProviders(<AppHeader />);
        expect(screen.getByRole('button', { name: /toggle language/i })).toBeInTheDocument();
    });

    it('renders a theme toggle button', () => {
        renderWithProviders(<AppHeader />);
        expect(
            screen.getByRole('button', { name: /switch to (light|dark) mode/i })
        ).toBeInTheDocument();
    });

    it('renders as a header landmark', () => {
        renderWithProviders(<AppHeader />);
        expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
        const { container } = renderWithProviders(<AppHeader />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});
