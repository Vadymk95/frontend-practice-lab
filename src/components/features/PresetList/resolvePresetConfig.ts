import { computeAvailableCount } from '@/components/features/SessionConfigurator/useSessionConfigurator';
import type { ManifestEntry } from '@/hooks/data/useCategories';
import type { SessionConfig } from '@/lib/storage/types';

/**
 * Presets live in localStorage indefinitely, so the content can move underneath
 * them. Returns the config to start — unknown category slugs dropped and
 * questionCount clamped to what is left — or null when nothing startable
 * remains. An empty manifest means "cannot validate", not "everything is gone".
 */
export function resolvePresetConfig(
    config: SessionConfig,
    categories: ManifestEntry[]
): SessionConfig | null {
    if (categories.length === 0) return config;

    const known = config.categories.filter((slug) => categories.some((c) => c.slug === slug));
    if (known.length === 0) return null;

    const available = computeAvailableCount(categories, known, config.difficulty, config.mode);
    if (available === 0) return null;

    return {
        ...config,
        categories: known,
        questionCount: Math.min(config.questionCount, available)
    };
}
