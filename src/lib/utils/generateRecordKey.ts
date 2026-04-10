import type { SessionConfig } from '@/lib/storage/types';

export function generateRecordKey(config: SessionConfig): string {
    const cats = [...config.categories].sort().join(',');
    return `${cats}|${config.difficulty}|${config.mode}|${config.questionCount}`;
}
