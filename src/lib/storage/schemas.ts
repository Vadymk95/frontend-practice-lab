import { z } from 'zod';

export const WeightsSchema = z.record(z.string(), z.number());

export const ErrorRatesSchema = z.record(z.string(), z.number());

export const StreakSchema = z.object({
    current: z.number(),
    lastActivityDate: z.string()
});

export const RecordsSchema = z.record(z.string(), z.number());

export const ThemeSchema = z.enum(['dark', 'light']);

export const LanguageSchema = z.enum(['ru', 'en']);

const SessionConfigSchema = z.object({
    categories: z.array(z.string()),
    questionCount: z.number(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'all']),
    mode: z.enum(['quiz', 'bug-finding', 'code-completion', 'all']),
    order: z.enum(['random', 'sequential']),
    timerEnabled: z.boolean().optional()
});

export const SessionPresetSchema = z.object({
    id: z.string(),
    name: z.string(),
    config: SessionConfigSchema,
    createdAt: z.string(),
    lastUsedAt: z.string()
});

export const PresetsSchema = z.array(SessionPresetSchema);

export const LastSessionResultsSchema = z.record(z.string(), z.boolean());
