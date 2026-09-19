// Content-quality gate for public/data/*.json — the checks the Zod schema cannot express.
//
// Born from the 2026-09-16 audit of the AI-generated bank: the correct option sat at index 1
// in 74% of single-choice questions (Next.js 22 of 22), was the longest option in 81%, two
// code-completion blanks expected an empty string (unanswerable), three questions were
// duplicated across files, seven multi-choice questions had every option correct, and ~40
// option strings were never translated. Every one of those is a finding here.
//
// Levels: `error` fails the gate; `warn` prints and passes (a signal the content pass reads,
// not a bar new content is held to yet). Thresholds are data — change them here, with the
// reason in the commit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CategoryFileSchema, type Question } from '../lib/data/schema.ts';

export const THRESHOLDS = {
    /** Max share of single-choice questions in one file whose correct answer sits at one index. */
    MAX_CORRECT_INDEX_SHARE: 0.6,
    /** Max share of single-choice questions in one file whose correct option is the longest. */
    MAX_LONGEST_OPTION_SHARE: 0.6,
    /** Share checks need a sample; below this many single-choice questions they are skipped. */
    MIN_QUESTIONS_FOR_SHARE: 8,
    /** A RU string with this many Latin words, a function word and no Cyrillic is untranslated. */
    MIN_LATIN_WORDS_UNTRANSLATED: 4,
    /** Explanations shorter than this are a warning: they rarely teach anything. */
    MIN_EXPLANATION_CHARS: 40
} as const;

export interface DataFinding {
    level: 'error' | 'warn';
    kind: string;
    file: string;
    id?: string;
    detail: string;
}

export interface CategoryFile {
    file: string;
    questions: Question[];
}

const ENGLISH_FUNCTION_WORD =
    /\b(the|a|an|of|to|with|in|on|for|and|is|are|that|this|from|by|or|not|it|be|as|at|when|which|use|using)\b/i;
const CYRILLIC = /[а-яё]/i;
const FENCE = '```';

const normalizeStem = (s: string): string =>
    s
        .toLowerCase()
        .replace(/[`*_#>\-\s.,:;!?()'"«»]+/g, ' ')
        .trim();

const latinWordCount = (s: string): number =>
    s.split(/\s+/).filter((w) => /[a-z]{3,}/i.test(w)).length;

/** Natural-language RU text that was left in English. Identifiers, headers and code pass. */
export function isUntranslated(ru: string): boolean {
    if (CYRILLIC.test(ru)) return false;
    if (latinWordCount(ru) < THRESHOLDS.MIN_LATIN_WORDS_UNTRANSLATED) return false;
    return ENGLISH_FUNCTION_WORD.test(ru);
}

type Localized = { en: string; ru: string };

function localizedFields(q: Question): Array<[string, Localized]> {
    const fields: Array<[string, Localized]> = [
        ['question', q.question],
        ['explanation', q.explanation]
    ];
    if ('options' in q && q.options) {
        q.options.forEach((o, i) => fields.push([`options[${i}]`, o]));
    }
    return fields;
}

function shareFindings(file: string, questions: Question[]): DataFinding[] {
    const single = questions.filter((q) => q.type === 'single-choice');
    if (single.length < THRESHOLDS.MIN_QUESTIONS_FOR_SHARE) return [];

    const byIndex = new Map<number, number>();
    let longest = 0;
    for (const q of single) {
        byIndex.set(q.correct, (byIndex.get(q.correct) ?? 0) + 1);
        const lengths = q.options.map((o) => o.en.length);
        const max = Math.max(...lengths);
        const correctLength = lengths[q.correct] ?? 0;
        if (correctLength === max && lengths.filter((l) => l === max).length === 1) longest++;
    }

    const findings: DataFinding[] = [];
    const [topIndex, topCount] = [...byIndex.entries()].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];
    const indexShare = topCount / single.length;
    if (indexShare > THRESHOLDS.MAX_CORRECT_INDEX_SHARE) {
        findings.push({
            level: 'error',
            kind: 'correct-index-bias',
            file,
            detail: `correct answer is option ${topIndex} in ${topCount}/${single.length} single-choice questions (${Math.round(indexShare * 100)}%, max ${THRESHOLDS.MAX_CORRECT_INDEX_SHARE * 100}%) — a learner can score by position; permute options`
        });
    }
    const longestShare = longest / single.length;
    if (longestShare > THRESHOLDS.MAX_LONGEST_OPTION_SHARE) {
        findings.push({
            level: 'warn',
            kind: 'longest-option-bias',
            file,
            detail: `correct answer is the longest option in ${longest}/${single.length} single-choice questions (${Math.round(longestShare * 100)}%, max ${THRESHOLDS.MAX_LONGEST_OPTION_SHARE * 100}%) — a learner can score by length; rewrite distractors to length parity`
        });
    }
    return findings;
}

export function auditBank(files: CategoryFile[]): DataFinding[] {
    const findings: DataFinding[] = [];
    const seenIds = new Map<string, string>();
    const seenStems = new Map<string, string>();

    for (const { file, questions } of files) {
        const slug = file.replace(/\.json$/, '');
        const push = (level: DataFinding['level'], kind: string, id: string, detail: string) =>
            findings.push({ level, kind, file, id, detail });

        for (const q of questions) {
            const priorFile = seenIds.get(q.id);
            if (priorFile) push('error', 'duplicate-id', q.id, `also in ${priorFile}`);
            else seenIds.set(q.id, file);

            if (q.category !== slug) {
                push(
                    'error',
                    'category-mismatch',
                    q.id,
                    `category "${q.category}" ≠ file "${slug}"`
                );
            }

            const stem = normalizeStem(q.question.en);
            const priorStem = seenStems.get(stem);
            if (priorStem) push('error', 'duplicate-question', q.id, `same stem as ${priorStem}`);
            else seenStems.set(stem, `${file}:${q.id}`);

            for (const [name, value] of localizedFields(q)) {
                if (!value.en.trim() || !value.ru.trim()) {
                    push('error', 'empty-text', q.id, name);
                    continue;
                }
                if (value.en.includes(FENCE) || value.ru.includes(FENCE)) {
                    push(
                        'error',
                        'fence-in-text',
                        q.id,
                        `${name} contains a \`\`\` fence — put the snippet in the \`code\` field`
                    );
                }
                if (isUntranslated(value.ru)) {
                    push('error', 'untranslated-ru', q.id, `${name}: ${value.ru.slice(0, 60)}`);
                }
            }

            if (q.explanation.en.trim().length < THRESHOLDS.MIN_EXPLANATION_CHARS) {
                push('warn', 'short-explanation', q.id, `${q.explanation.en.length} chars`);
            }

            if (q.type === 'single-choice') {
                if (q.correct >= q.options.length) {
                    push(
                        'error',
                        'correct-out-of-range',
                        q.id,
                        `${q.correct} of ${q.options.length}`
                    );
                }
            } else if (q.type === 'multi-choice') {
                if (q.correct.length === 0) push('error', 'multi-no-correct', q.id, '');
                if (new Set(q.correct).size !== q.correct.length) {
                    push('error', 'multi-duplicate-correct', q.id, q.correct.join(','));
                }
                if (q.correct.some((i) => i >= q.options.length)) {
                    push(
                        'error',
                        'correct-out-of-range',
                        q.id,
                        `${q.correct.join(',')} of ${q.options.length}`
                    );
                }
                if (q.correct.length > 0 && q.correct.length === q.options.length) {
                    push(
                        'error',
                        'multi-all-correct',
                        q.id,
                        'every option is correct — the question tests nothing'
                    );
                }
            } else if (q.type === 'code-completion') {
                q.blanks.forEach((blank, i) => {
                    if (!blank.trim()) {
                        push(
                            'error',
                            'empty-blank',
                            q.id,
                            `blank ${i} expects an empty string — unanswerable`
                        );
                    }
                });
                if (!q.lang) push('error', 'missing-lang', q.id, 'code-completion without `lang`');
            } else if (q.type === 'bug-finding') {
                if (!(q as { lang?: string }).lang) {
                    push('error', 'missing-lang', q.id, 'bug-finding without `lang`');
                }
            }
        }

        findings.push(...shareFindings(file, questions));
    }

    return findings;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT, 'public/data');

export function loadBank(dataDir: string): CategoryFile[] {
    return fs
        .readdirSync(dataDir)
        .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
        .sort()
        .map((file) => ({
            file,
            questions: CategoryFileSchema.parse(
                JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8')) as unknown
            )
        }));
}

export function main(dataDir: string = DATA_DIR): void {
    const bank = loadBank(dataDir);
    if (bank.length === 0) {
        console.error(`No JSON files found in ${dataDir}`);
        process.exit(1);
    }

    const findings = auditBank(bank);
    const errors = findings.filter((f) => f.level === 'error');
    const warnings = findings.filter((f) => f.level === 'warn');

    for (const f of findings) {
        const where = f.id ? `${f.file} ${f.id}` : f.file;
        console.log(`${f.level === 'error' ? '✗' : '⚠'} ${f.kind} — ${where}: ${f.detail}`);
    }
    const total = bank.reduce((n, c) => n + c.questions.length, 0);
    console.log(
        `\ndata check: ${bank.length} files, ${total} questions, ${errors.length} errors, ${warnings.length} warnings`
    );

    if (errors.length > 0) {
        console.error('\nData quality check failed. Fix the errors above.');
        process.exit(1);
    }
    console.log('✅ Data quality check passed.');
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
