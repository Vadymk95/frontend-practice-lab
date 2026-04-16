import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { ErrorBoundary } from './index';

const Bomb = () => {
    throw new Error('Boom');
};

describe('ErrorBoundary', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('renders fallback UI when child throws', () => {
        renderWithProviders(
            <ErrorBoundary>
                <Bomb />
            </ErrorBoundary>
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
        expect(
            screen.getByText(/something went wrong\. please try again later/i)
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });
});
