import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InlineMarkdown } from './InlineMarkdown';

describe('InlineMarkdown', () => {
    it('renders a backtick span as a <code> element', () => {
        const { container } = render(<InlineMarkdown text="What does `typeof null` return?" />);
        const code = container.querySelector('code');
        expect(code).not.toBeNull();
        expect(code).toHaveTextContent('typeof null');
    });

    it('renders a bold span as a <strong> element', () => {
        const { container } = render(<InlineMarkdown text="this is **not** allowed" />);
        expect(container.querySelector('strong')).toHaveTextContent('not');
    });

    it('renders a newline as a line break', () => {
        const { container } = render(<InlineMarkdown text={'one\ntwo'} />);
        expect(container.querySelectorAll('br')).toHaveLength(1);
    });

    it('renders HTML in the source as literal text, never as markup', () => {
        const { container } = render(<InlineMarkdown text={'<img src=x onerror="alert(1)">'} />);
        expect(container.querySelector('img')).toBeNull();
        expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument();
    });

    it('keeps plain prose readable as one string', () => {
        render(<InlineMarkdown text="plain question stem" />);
        expect(screen.getByText('plain question stem')).toBeInTheDocument();
    });
});
