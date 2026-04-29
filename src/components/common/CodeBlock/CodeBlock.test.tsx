import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { CodeBlock } from './CodeBlock';

vi.mock('@/lib/shiki', () => ({
    getHighlighter: vi.fn().mockResolvedValue({
        codeToHtml: (code: string) =>
            `<pre class="shiki"><code>${code.replace(/</g, '&lt;')}</code></pre>`
    })
}));

describe('CodeBlock', () => {
    beforeEach(() => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders fallback while loading', async () => {
        const { getHighlighter } = await import('@/lib/shiki');
        vi.mocked(getHighlighter).mockReturnValue(new Promise(() => {}));

        renderWithProviders(<CodeBlock code="const x = 1" lang="javascript" />);

        expect(screen.getByText('const x = 1')).toBeInTheDocument();
    });

    it('renders highlighted HTML after load', async () => {
        const { getHighlighter } = await import('@/lib/shiki');
        vi.mocked(getHighlighter).mockResolvedValue({
            codeToHtml: (code: string) =>
                `<pre class="shiki"><code>${code.replace(/</g, '&lt;')}</code></pre>`
        } as unknown as Awaited<ReturnType<typeof getHighlighter>>);

        renderWithProviders(<CodeBlock code="const x = 1" lang="javascript" />);

        await waitFor(() => {
            const container = document.querySelector('.shiki');
            expect(container).toBeInTheDocument();
        });
    });

    it('shows language label', () => {
        renderWithProviders(<CodeBlock code="const x: number = 1" lang="typescript" />);

        expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('copy button triggers clipboard', async () => {
        renderWithProviders(<CodeBlock code="const x = 1" lang="javascript" />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const x = 1');
    });

    it('copy button shows Copied state then reverts', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: false });

        try {
            renderWithProviders(<CodeBlock code="const x = 1" lang="javascript" />);

            // Click and flush the clipboard promise microtask
            fireEvent.click(screen.getByRole('button'));
            await act(async () => {
                await Promise.resolve();
            });

            expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Copied');

            act(() => {
                vi.advanceTimersByTime(2000);
            });

            expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Copy');
        } finally {
            vi.useRealTimers();
        }
    });

    it('scrolling container carries the theme background', () => {
        const { container } = renderWithProviders(
            <CodeBlock code="const x = 1" lang="javascript" />
        );

        // The scroll container is the inner div with max-h + overflow-auto.
        // Asserting its bg classes guards against regressions where the bg lives
        // only on the outer wrapper and a transparent strip appears on horizontal
        // scroll (see bug-fix story 2026-04-29).
        const scroller = container.querySelector('.overflow-auto');
        expect(scroller).not.toBeNull();
        expect(scroller?.className).toContain('bg-white');
        expect(scroller?.className).toContain('dark:bg-[#0d1117]');
    });

    it('cleanup cancels in-flight highlight on unmount', async () => {
        let resolveHighlighter!: (
            value: Awaited<ReturnType<typeof import('@/lib/shiki').getHighlighter>>
        ) => void;
        const { getHighlighter } = await import('@/lib/shiki');
        const codeToHtml = vi
            .fn()
            .mockImplementation((code: string) => `<pre class="shiki"><code>${code}</code></pre>`);
        vi.mocked(getHighlighter).mockReturnValue(
            new Promise((resolve) => {
                resolveHighlighter = resolve;
            })
        );

        const { unmount } = renderWithProviders(<CodeBlock code="const x = 1" lang="javascript" />);

        unmount();

        await act(async () => {
            resolveHighlighter({
                codeToHtml
            } as unknown as Awaited<ReturnType<typeof import('@/lib/shiki').getHighlighter>>);
        });

        expect(codeToHtml).not.toHaveBeenCalled();
    });
});
