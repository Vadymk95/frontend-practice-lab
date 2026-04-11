// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { main } from './generate-manifest.ts';

const EASY_QUESTION = {
    id: 'q1',
    type: 'single-choice' as const,
    category: 'test',
    difficulty: 'easy' as const,
    tags: ['test'],
    question: 'What is 2+2?',
    explanation: 'Basic arithmetic.',
    options: ['3', '4', '5', '6'],
    correct: 1
};

const HARD_QUESTION = {
    id: 'q2',
    type: 'bug-finding' as const,
    category: 'test',
    difficulty: 'hard' as const,
    tags: ['bugs'],
    question: 'Find the bug.',
    explanation: 'There is one.',
    code: 'const x = 1',
    correct: 'off-by-one',
    referenceAnswer: 'It is off-by-one'
};

let tmpDir: string;
let manifestPath: string;

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-manifest-test-'));
    manifestPath = path.join(tmpDir, 'manifest.json');
});

afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
});

describe('generate-manifest main()', () => {
    it('writes manifest.json with correct slug and counts for N category files', () => {
        fs.writeFileSync(path.join(tmpDir, 'alpha.json'), JSON.stringify([EASY_QUESTION]));
        fs.writeFileSync(
            path.join(tmpDir, 'beta-cat.json'),
            JSON.stringify([EASY_QUESTION, HARD_QUESTION])
        );

        vi.spyOn(console, 'log').mockImplementation(() => undefined);

        main(tmpDir, manifestPath);

        type Counts = {
            easy: number;
            medium: number;
            hard: number;
            total: number;
            quiz: number;
            bugFinding: number;
            codeCompletion: number;
        };
        type Entry = { slug: string; counts: Counts };

        const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Entry[];
        expect(written).toHaveLength(2);

        const slugs = written.map((e) => e.slug).sort();
        expect(slugs).toEqual(['alpha', 'beta-cat']);

        const alpha = written.find((e) => e.slug === 'alpha');
        expect(alpha?.counts).toEqual({
            total: 1,
            easy: 1,
            medium: 0,
            hard: 0,
            quiz: 1,
            bugFinding: 0,
            codeCompletion: 0
        });

        const betaCat = written.find((e) => e.slug === 'beta-cat');
        expect(betaCat?.counts).toEqual({
            total: 2,
            easy: 1,
            medium: 0,
            hard: 1,
            quiz: 1,
            bugFinding: 1,
            codeCompletion: 0
        });
    });

    it('exits 1 when data directory has no JSON files', () => {
        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: number | string | null) => {
                throw new Error(`process.exit(${String(_code)})`);
            });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() => main(tmpDir, manifestPath)).toThrow('process.exit(1)');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 when a category file is malformed', () => {
        fs.writeFileSync(path.join(tmpDir, 'broken.json'), JSON.stringify({ bad: true }));

        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: number | string | null) => {
                throw new Error(`process.exit(${String(_code)})`);
            });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() => main(tmpDir, manifestPath)).toThrow('process.exit(1)');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('manifest.json in data dir is excluded from processing', () => {
        fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify([{ slug: 'old' }]));
        fs.writeFileSync(path.join(tmpDir, 'real.json'), JSON.stringify([EASY_QUESTION]));

        vi.spyOn(console, 'log').mockImplementation(() => undefined);

        main(tmpDir, manifestPath);

        const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as unknown[];
        expect(written).toHaveLength(1);
        expect((written as Array<{ slug: string }>)[0].slug).toBe('real');
    });

    it('generates correct displayName from slug', () => {
        fs.writeFileSync(path.join(tmpDir, 'my-topic.json'), JSON.stringify([EASY_QUESTION]));

        vi.spyOn(console, 'log').mockImplementation(() => undefined);

        main(tmpDir, manifestPath);

        const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Array<{
            slug: string;
            displayName: string;
        }>;
        expect(written[0].displayName).toBe('My Topic');
    });
});
