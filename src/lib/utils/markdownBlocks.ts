/**
 * Splits a reference answer into prose and fenced code blocks. 11 bug-finding reference
 * answers carry a ```lang fence inside otherwise plain prose, and rendering the whole
 * string through a code block turns the prose into fake code.
 *
 * An unterminated fence stays literal text — half a code block is never guessed at.
 */
export type MarkdownBlock =
    { type: 'text'; value: string } | { type: 'code'; value: string; lang?: string };

const FENCE = '```';

export const parseMarkdownBlocks = (input: string): MarkdownBlock[] => {
    const blocks: MarkdownBlock[] = [];
    const lines = input.split('\n');
    let prose: string[] = [];

    const flushProse = () => {
        const value = prose.join('\n').trim();
        if (value !== '') blocks.push({ type: 'text', value });
        prose = [];
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i]!;
        if (!line.startsWith(FENCE)) {
            prose.push(line);
            i += 1;
            continue;
        }

        const closing = lines.findIndex((l, idx) => idx > i && l.trim() === FENCE);
        if (closing === -1) {
            // Unterminated fence — keep the rest as prose, markers included.
            prose.push(...lines.slice(i));
            break;
        }

        flushProse();
        const lang = line.slice(FENCE.length).trim();
        const value = lines.slice(i + 1, closing).join('\n');
        blocks.push(lang === '' ? { type: 'code', value } : { type: 'code', value, lang });
        i = closing + 1;
    }

    flushProse();
    return blocks;
};
