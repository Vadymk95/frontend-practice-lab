// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { main } from './validate-data.ts';

const VALID_QUESTION = {
    id: 'q1',
    type: 'single-choice',
    category: 'test',
    difficulty: 'easy',
    tags: ['test'],
    question: 'What is 2+2?',
    explanation: 'Basic arithmetic.',
    options: ['3', '4', '5', '6'],
    correct: 1
};

let tmpDir: string;

beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-data-test-'));
});

afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
});

describe('validate-data main()', () => {
    it('exits 0 and logs ✓ for a valid category file', () => {
        fs.writeFileSync(path.join(tmpDir, 'test-cat.json'), JSON.stringify([VALID_QUESTION]));

        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: number | string | null) => {
                throw new Error(`process.exit called with ${String(_code)}`);
            });
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        expect(() => main(tmpDir)).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('✓ test-cat.json'));
    });

    it('exits 1 when the data directory has no JSON files', () => {
        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: number | string | null) => {
                throw new Error(`process.exit(${String(_code)})`);
            });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() => main(tmpDir)).toThrow('process.exit(1)');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 and logs ✗ when a category file is malformed', () => {
        fs.writeFileSync(path.join(tmpDir, 'bad.json'), JSON.stringify({}));

        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: number | string | null) => {
                throw new Error(`process.exit(${String(_code)})`);
            });
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() => main(tmpDir)).toThrow('process.exit(1)');
        expect(exitSpy).toHaveBeenCalledWith(1);
        // Header line: no second argument after the fix (was logging raw err as 2nd arg)
        expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('✗ bad.json'));
        // Field-level error line present
        expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('(root):'));
    });

    it('manifest.json is ignored when scanning for category files', () => {
        fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify([{ slug: 'x' }]));
        fs.writeFileSync(path.join(tmpDir, 'real.json'), JSON.stringify([VALID_QUESTION]));

        const exitSpy = vi
            .spyOn(process, 'exit')
            .mockImplementation((_code?: number | string | null) => {
                throw new Error(`process.exit(${String(_code)})`);
            });
        vi.spyOn(console, 'log').mockImplementation(() => undefined);

        // Should not throw — manifest.json must be excluded from validation
        expect(() => main(tmpDir)).not.toThrow();
        expect(exitSpy).not.toHaveBeenCalled();
    });
});
