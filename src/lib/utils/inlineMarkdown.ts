/**
 * Minimal inline-markdown reader for question content. The bank uses backticks in 176 stems
 * and 227 explanations, `**bold**` in 15, single-marker italics in 47, plus hard newlines —
 * everything else is literal.
 *
 * Deliberately NOT a markdown library: the result is a token list rendered as React nodes,
 * so no HTML from the data can ever reach the DOM.
 */
export type InlineSegment =
    | { type: 'text'; value: string }
    | { type: 'code'; value: string }
    | { type: 'bold'; value: string }
    | { type: 'italic'; value: string }
    | { type: 'break' };

const CODE_MARKER = '`';
const BOLD_MARKER = '**';
const ITALIC_MARKERS = ['*', '_'] as const;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

export const parseInlineMarkdown = (input: string): InlineSegment[] => {
    const segments: InlineSegment[] = [];
    let literal = '';

    const flushLiteral = () => {
        if (literal !== '') {
            segments.push({ type: 'text', value: literal });
            literal = '';
        }
    };

    let i = 0;
    while (i < input.length) {
        const rest = input.slice(i);

        if (rest.startsWith(BOLD_MARKER)) {
            const end = input.indexOf(BOLD_MARKER, i + BOLD_MARKER.length);
            const value = end === -1 ? '' : input.slice(i + BOLD_MARKER.length, end);
            if (value !== '') {
                flushLiteral();
                segments.push({ type: 'bold', value });
                i = end + BOLD_MARKER.length;
                continue;
            }
        }

        if (rest.startsWith(CODE_MARKER)) {
            const end = input.indexOf(CODE_MARKER, i + CODE_MARKER.length);
            const value = end === -1 ? '' : input.slice(i + CODE_MARKER.length, end);
            if (value !== '') {
                flushLiteral();
                segments.push({ type: 'code', value });
                i = end + CODE_MARKER.length;
                continue;
            }
        }

        const italicMarker = ITALIC_MARKERS.find((m) => m === input[i]);
        if (italicMarker !== undefined) {
            // `_` inside a word is an identifier (snake_case), never emphasis; `*` has no such
            // ambiguity. An italic never spans a line break, so a stray marker stays literal.
            const opensWord =
                italicMarker === '_' && WORD_CHARACTER.test(i > 0 ? (input[i - 1] ?? '') : '');
            const end = opensWord ? -1 : input.indexOf(italicMarker, i + 1);
            const value = end === -1 ? '' : input.slice(i + 1, end);
            const closesWord = italicMarker === '_' && WORD_CHARACTER.test(input[end + 1] ?? '');
            if (value !== '' && !value.includes('\n') && !closesWord) {
                flushLiteral();
                segments.push({ type: 'italic', value });
                i = end + italicMarker.length;
                continue;
            }
        }

        if (input[i] === '\n') {
            flushLiteral();
            segments.push({ type: 'break' });
            i += 1;
            continue;
        }

        literal += input[i];
        i += 1;
    }

    flushLiteral();
    return segments;
};
