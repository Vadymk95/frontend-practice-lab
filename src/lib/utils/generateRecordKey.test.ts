import { describe, expect, it } from 'vitest';

import type { SessionConfig } from '@/lib/storage/types';

import { generateRecordKey } from './generateRecordKey';

const baseConfig: SessionConfig = {
    categories: ['javascript'],
    questionCount: 10,
    difficulty: 'all',
    mode: 'quiz',
    order: 'random'
};

describe('generateRecordKey', () => {
    it('generates a deterministic key from config', () => {
        const key = generateRecordKey(baseConfig);
        expect(key).toBe('javascript|all|quiz|10');
    });

    it('sorts categories for stable key regardless of input order', () => {
        const config1: SessionConfig = {
            ...baseConfig,
            categories: ['typescript', 'javascript']
        };
        const config2: SessionConfig = {
            ...baseConfig,
            categories: ['javascript', 'typescript']
        };
        expect(generateRecordKey(config1)).toBe(generateRecordKey(config2));
    });

    it('includes difficulty in the key', () => {
        const easy = generateRecordKey({ ...baseConfig, difficulty: 'easy' });
        const hard = generateRecordKey({ ...baseConfig, difficulty: 'hard' });
        expect(easy).not.toBe(hard);
        expect(easy).toContain('easy');
        expect(hard).toContain('hard');
    });

    it('includes mode in the key', () => {
        const quiz = generateRecordKey({ ...baseConfig, mode: 'quiz' });
        const bugFinding = generateRecordKey({ ...baseConfig, mode: 'bug-finding' });
        expect(quiz).not.toBe(bugFinding);
    });

    it('includes questionCount in the key', () => {
        const ten = generateRecordKey({ ...baseConfig, questionCount: 10 });
        const twenty = generateRecordKey({ ...baseConfig, questionCount: 20 });
        expect(ten).not.toBe(twenty);
    });

    it('does not include order in the key (order does not affect record identity)', () => {
        const random = generateRecordKey({ ...baseConfig, order: 'random' });
        const sequential = generateRecordKey({ ...baseConfig, order: 'sequential' });
        expect(random).toBe(sequential);
    });
});
