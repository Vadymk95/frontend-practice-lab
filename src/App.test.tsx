import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { App } from './App';

describe('App', () => {
    it('renders a skip link pointing to #main-content', () => {
        renderWithProviders(<App />);
        const skipLink = screen.getByRole('link', { name: /skip to main content/i });
        expect(skipLink).toBeInTheDocument();
        expect(skipLink).toHaveAttribute('href', '#main-content');
    });
});
