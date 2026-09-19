const SMART_QUOTES: Record<string, string> = {
    '‘': "'",
    '’': "'",
    '“': '"',
    '”': '"'
};

const SMART_QUOTE_PATTERN = /[‘’“”]/g;
const TRAILING_SEMICOLON_PATTERN = /\s*;\s*$/;
const WHITESPACE_RUN_PATTERN = /\s+/g;

/**
 * Canonical form for comparing a typed code-completion blank with the authored answer.
 * Applied to BOTH sides, so it can only make a match more forgiving, never stricter.
 *
 * Tolerates what a phone keyboard and normal code style vary and nothing else:
 * smart punctuation (iOS substitutes U+2019 for an apostrophe), internal whitespace
 * (19 blanks in the bank are multi-token), one trailing semicolon, and letter case.
 */
export const normalizeAnswer = (value: string): string =>
    value
        .replace(SMART_QUOTE_PATTERN, (quote) => SMART_QUOTES[quote] ?? quote)
        .trim()
        .replace(TRAILING_SEMICOLON_PATTERN, '')
        .replace(WHITESPACE_RUN_PATTERN, ' ')
        .trim()
        .toLowerCase();
