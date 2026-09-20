// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { auditBank, isUntranslated, main, THRESHOLDS } from './check-data-quality.ts';
import type { Question } from '../lib/data/schema.ts';

const loc = (en: string, ru = `RU: ${en} — текст`) => ({ en, ru });

function single(id: string, overrides: Partial<Question> = {}): Question {
    return {
        id,
        type: 'single-choice',
        category: 'cat',
        difficulty: 'easy',
        tags: ['t'],
        question: loc(`Question ${id}?`),
        explanation: loc(`Explanation for ${id} that is long enough to teach something.`),
        options: [loc('alpha'), loc('beta'), loc('gamma'), loc('delta')],
        correct: 0,
        ...overrides
    } as Question;
}

function multi(id: string, correct: number[]): Question {
    return { ...single(id), type: 'multi-choice', correct } as Question;
}

function completion(id: string, blanks: string[], lang?: string): Question {
    return {
        id,
        type: 'code-completion',
        category: 'cat',
        difficulty: 'easy',
        tags: ['t'],
        question: loc(`Complete ${id}:`),
        explanation: loc(`Explanation for ${id} that is long enough to teach something.`),
        code: blanks.map(() => '__BLANK__').join(' '),
        blanks,
        lang,
        referenceAnswer: { en: 'ref', ru: 'ref' }
    } as Question;
}

const kinds = (findings: ReturnType<typeof auditBank>) => findings.map((f) => f.kind);
const bank = (questions: Question[], file = 'cat.json') => [{ file, questions }];

describe('isUntranslated', () => {
    it('flags an English sentence left in the RU field', () => {
        expect(isUntranslated('Replacing all label elements with placeholder attributes')).toBe(
            true
        );
    });

    it('passes identifiers, headers and orderings that have no natural language', () => {
        expect(isUntranslated('Cache-Control: max-age=31536000, immutable')).toBe(false);
        expect(isUntranslated('shared → entities → features → widgets → pages → app')).toBe(false);
        expect(isUntranslated('POST')).toBe(false);
    });

    it('passes any string that contains Cyrillic', () => {
        expect(isUntranslated('Использовать the fetch API with an AbortController')).toBe(false);
    });
});

describe('auditBank', () => {
    it('reports nothing for a clean bank', () => {
        const clean = [single('q1'), single('q2', { correct: 1 }), multi('q3', [0, 2])];
        expect(auditBank(bank(clean))).toEqual([]);
    });

    it('flags a duplicate id across files and a category that does not match the file', () => {
        const findings = auditBank([
            { file: 'cat.json', questions: [single('q1')] },
            { file: 'other.json', questions: [single('q1', { category: 'cat' })] }
        ]);
        expect(kinds(findings)).toEqual(
            expect.arrayContaining(['duplicate-id', 'category-mismatch'])
        );
    });

    it('flags the same question stem asked twice, ignoring punctuation and backticks', () => {
        const a = single('q1', { question: loc('What does `typeof null` return?') });
        const b = single('q2', { question: loc('What does typeof null return') });
        expect(kinds(auditBank(bank([a, b])))).toContain('duplicate-question');
    });

    it('flags an empty expected blank as unanswerable and a code question without lang', () => {
        const findings = auditBank(bank([completion('c1', ['Logger', ''], 'typescript')]));
        expect(kinds(findings)).toContain('empty-blank');
        expect(kinds(auditBank(bank([completion('c2', ['x'])])))).toContain('missing-lang');
    });

    it('flags a multi-choice question where every option is correct', () => {
        expect(kinds(auditBank(bank([multi('m1', [0, 1, 2, 3])])))).toContain('multi-all-correct');
    });

    it('flags a markdown fence inside a stem and an untranslated option', () => {
        const fenced = single('q1', { question: loc('What prints?\n```js\nconsole.log(1)\n```') });
        const untranslated = single('q2', {
            options: [
                {
                    en: 'Use the fetch API with an AbortController',
                    ru: 'Use the fetch API with an AbortController'
                },
                loc('beta'),
                loc('gamma'),
                loc('delta')
            ]
        });
        const findings = auditBank(bank([fenced, untranslated]));
        expect(kinds(findings)).toEqual(
            expect.arrayContaining(['fence-in-text', 'untranslated-ru'])
        );
    });

    it('fails a file whose correct answers cluster on one index, and passes a balanced one', () => {
        const n = THRESHOLDS.MIN_QUESTIONS_FOR_SHARE;
        const biased = Array.from({ length: n }, (_, i) => single(`b${i}`, { correct: 1 }));
        const balanced = Array.from({ length: n }, (_, i) => single(`g${i}`, { correct: i % 4 }));
        expect(kinds(auditBank(bank(biased)))).toContain('correct-index-bias');
        expect(kinds(auditBank(bank(balanced)))).not.toContain('correct-index-bias');
    });

    it('skips the share checks below the sample size, so a tiny category is not judged', () => {
        const few = Array.from({ length: THRESHOLDS.MIN_QUESTIONS_FOR_SHARE - 1 }, (_, i) =>
            single(`s${i}`, { correct: 1 })
        );
        expect(kinds(auditBank(bank(few)))).not.toContain('correct-index-bias');
    });

    it('warns, not fails, when the correct option is systematically the longest', () => {
        const n = THRESHOLDS.MIN_QUESTIONS_FOR_SHARE;
        const longest = Array.from({ length: n }, (_, i) =>
            single(`l${i}`, {
                correct: i % 4,
                options: [loc('a'), loc('b'), loc('c'), loc('d')].map((o, j) =>
                    j === i % 4 ? loc('the one that is much longer than the rest') : o
                )
            })
        );
        const findings = auditBank(bank(longest));
        const bias = findings.find((f) => f.kind === 'longest-option-bias');
        expect(bias?.level).toBe('warn');
        expect(findings.filter((f) => f.level === 'error')).toEqual([]);
    });
});

describe('main()', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-quality-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('exits 1 on an error-level finding and 0 on a clean directory', () => {
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: unknown) => {
            throw new Error(`exit ${String(code)}`);
        });
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        fs.writeFileSync(
            path.join(tmpDir, 'cat.json'),
            JSON.stringify([completion('c1', ['ok', ''], 'javascript')])
        );
        expect(() => main(tmpDir)).toThrow('exit 1');
        expect(exitSpy).toHaveBeenCalledWith(1);

        fs.writeFileSync(path.join(tmpDir, 'cat.json'), JSON.stringify([single('q1')]));
        expect(() => main(tmpDir)).not.toThrow();
    });
});

describe('localized reference answers', () => {
    it('flags a reference answer whose RU side is still English', () => {
        const q = completion('cc-untranslated', ['x'], 'javascript');
        (q as { referenceAnswer: unknown }).referenceAnswer = {
            en: 'Move the catch to the end of the chain so failures skip every later step.',
            ru: 'Move the catch to the end of the chain so failures skip every later step.'
        };
        const findings = auditBank(bank([q]));
        expect(kinds(findings)).toContain('untranslated-ru');
        expect(findings.find((f) => f.kind === 'untranslated-ru')?.detail).toContain(
            'referenceAnswer'
        );
    });

    it('flags a reference answer with an empty translation', () => {
        const q = completion('cc-empty-ru', ['x'], 'javascript');
        (q as { referenceAnswer: unknown }).referenceAnswer = { en: 'Move the catch.', ru: '  ' };
        expect(kinds(auditBank(bank([q])))).toContain('empty-text');
    });

    it('passes a translated reference answer', () => {
        const translated = completion('cc-translated', ['x'], 'javascript');
        (translated as { referenceAnswer: unknown }).referenceAnswer = {
            en: 'Move the catch to the end.',
            ru: 'Перенесите catch в конец цепочки.'
        };
        expect(kinds(auditBank(bank([translated])))).toEqual([]);
    });
});
