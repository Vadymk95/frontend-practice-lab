import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownBlocks } from './MarkdownBlocks';

vi.mock('@/lib/shiki', () => ({
    getHighlighter: vi.fn().mockResolvedValue({
        codeToHtml: (code: string) => `<pre class="shiki"><code>${code}</code></pre>`
    })
}));

describe('MarkdownBlocks', () => {
    it('renders prose as text and the fenced part as a code block', () => {
        const text = 'Add the directive:\n```ts\nexport async function a() {}\n```';
        const { container } = render(<MarkdownBlocks text={text} />);

        expect(screen.getByText('Add the directive:')).toBeInTheDocument();
        expect(container.textContent).toContain('export async function a() {}');
        // The fence language wins over the fallback.
        expect(screen.getByText('ts')).toBeInTheDocument();
    });

    it('falls back to the question language when the fence has none', () => {
        render(<MarkdownBlocks text={'```\nconst a = 1;\n```'} lang="typescript" />);
        expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('renders prose without a fence as text, not as code', () => {
        const { container } = render(
            <MarkdownBlocks text="The callback captures a stale value." />
        );
        expect(screen.getByText('The callback captures a stale value.')).toBeInTheDocument();
        expect(container.querySelector('pre')).toBeNull();
    });

    it('renders inline markdown inside the prose blocks', () => {
        const { container } = render(<MarkdownBlocks text="use `useCallback` here" />);
        expect(container.querySelector('code')).toHaveTextContent('useCallback');
    });
});
