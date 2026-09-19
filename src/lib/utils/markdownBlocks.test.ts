import { describe, expect, it } from 'vitest';

import { parseMarkdownBlocks } from './markdownBlocks';

describe('parseMarkdownBlocks', () => {
    it('returns no blocks for an empty string', () => {
        expect(parseMarkdownBlocks('')).toEqual([]);
    });

    it('returns prose as a single text block', () => {
        expect(parseMarkdownBlocks('Move the call above the guard.')).toEqual([
            { type: 'text', value: 'Move the call above the guard.' }
        ]);
    });

    it('splits a fenced block out of surrounding prose and keeps its language', () => {
        const input = "Add `'use server'` first:\n```ts\nexport async function a() {}\n```";
        expect(parseMarkdownBlocks(input)).toEqual([
            { type: 'text', value: "Add `'use server'` first:" },
            { type: 'code', value: 'export async function a() {}', lang: 'ts' }
        ]);
    });

    it('leaves the language undefined on a bare fence', () => {
        expect(parseMarkdownBlocks('```\nconst a = 1;\n```')).toEqual([
            { type: 'code', value: 'const a = 1;' }
        ]);
    });

    it('keeps prose after a closed fence', () => {
        expect(parseMarkdownBlocks('before\n```\ncode\n```\nafter')).toEqual([
            { type: 'text', value: 'before' },
            { type: 'code', value: 'code' },
            { type: 'text', value: 'after' }
        ]);
    });

    it('keeps an unterminated fence literal instead of swallowing the rest', () => {
        expect(parseMarkdownBlocks('intro\n```ts\nconst a = 1;')).toEqual([
            { type: 'text', value: 'intro\n```ts\nconst a = 1;' }
        ]);
    });

    it('drops blank text between two fences', () => {
        expect(parseMarkdownBlocks('```\na\n```\n\n```\nb\n```')).toEqual([
            { type: 'code', value: 'a' },
            { type: 'code', value: 'b' }
        ]);
    });
});
