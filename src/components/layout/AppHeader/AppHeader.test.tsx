import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/lib/i18n';
import { DEFAULT_LANGUAGE } from '@/lib/i18n/constants';
import { axe } from '@/test/a11y';
import { renderWithProviders } from '@/test/test-utils';

import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
    // The shared i18next instance carries the HTTP backend from `@/lib/i18n`, so a
    // language switch would try to load /locales/**; answer it from memory instead.
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve('{}')
            })
        );
    });

    afterEach(async () => {
        await act(async () => {
            await i18n.changeLanguage(DEFAULT_LANGUAGE);
        });
        vi.unstubAllGlobals();
    });

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

    it('labels the toggle with the language actually rendered, not the stored one', async () => {
        await act(async () => {
            await i18n.changeLanguage('ru');
        });
        renderWithProviders(<AppHeader />);
        expect(screen.getByText('RU')).toBeInTheDocument();

        await act(async () => {
            await i18n.changeLanguage('en');
        });

        expect(screen.getByText('EN')).toBeInTheDocument();
    });
});
