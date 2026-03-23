import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { Main } from './index';

describe('Main', () => {
    it('renders main element with id="main-content"', () => {
        renderWithProviders(
            <MemoryRouter>
                <Main />
            </MemoryRouter>
        );
        expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    });
});
