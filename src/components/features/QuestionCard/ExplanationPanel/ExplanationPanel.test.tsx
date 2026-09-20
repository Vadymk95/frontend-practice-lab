import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { ExplanationPanel } from './ExplanationPanel';

describe('ExplanationPanel', () => {
    it('renders backticks in the explanation as a code element', () => {
        const { container } = renderWithProviders(
            <ExplanationPanel explanation="`typeof null` predates the spec fix." />
        );
        expect(container.querySelector('code')).toHaveTextContent('typeof null');
    });

    it('renders bold emphasis as a strong element', () => {
        const { container } = renderWithProviders(
            <ExplanationPanel explanation="This is **never** safe." />
        );
        expect(container.querySelector('strong')).toHaveTextContent('never');
    });

    it('keeps the labelled region for screen readers', () => {
        renderWithProviders(<ExplanationPanel explanation="Plain explanation." />);
        expect(screen.getByRole('complementary', { name: 'Explanation' })).toBeInTheDocument();
    });
});

describe('ExplanationPanel — reading size', () => {
    it('sets the explanation body at the phone reading size', () => {
        const { container } = renderWithProviders(
            <ExplanationPanel explanation="Plain explanation." />
        );
        const body = container.querySelector('p:last-of-type');
        expect(body?.className).toContain('text-base');
        expect(body?.className).not.toContain('text-sm');
    });
});
