import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Reads a custom property out of one selector block of index.css. */
const readToken = (selector: string, token: string): string => {
    const start = css.indexOf(`${selector} {`);
    expect(start, `${selector} block missing`).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('}', start));
    const match = block.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`));
    expect(match, `${token} missing in ${selector}`).not.toBeNull();
    return match![1]!;
};

const channelLuminance = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (
        0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
    );
};

const contrastRatio = (a: string, b: string): number => {
    const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (light! + 0.05) / (dark! + 0.05);
};

const AA_NORMAL_TEXT = 4.5;

describe('muted text tokens', () => {
    it('passes AA in dark theme, which is the default', () => {
        const ratio = contrastRatio(
            readToken(':root', '--color-txt-muted'),
            readToken(':root', '--color-bg')
        );
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it('passes AA in light theme', () => {
        const ratio = contrastRatio(
            readToken('html:not(.dark)', '--color-txt-muted'),
            readToken('html:not(.dark)', '--color-bg')
        );
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
});

describe('code scroll affordance', () => {
    const block = css.slice(
        css.indexOf('.code-scroll {'),
        css.indexOf('}', css.indexOf('.code-scroll {'))
    );

    it('is declared as an always-visible thin scrollbar', () => {
        expect(css).toContain('.code-scroll {');
        expect(block).toContain('scrollbar-width: thin');
        expect(block).toContain('scrollbar-color');
    });

    it('pins the edge shadows to the element and the covers to the content', () => {
        expect(block).toContain('background-attachment: local, local, scroll, scroll');
    });
});
