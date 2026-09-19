import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ManifestEntry } from '@/hooks/data/useCategories';
import { useCategories } from '@/hooks/data/useCategories';
import { useCategoryDisplay } from '@/hooks/data/useCategoryDisplay';
import type { SessionConfig } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useProgressStore } from '@/store/progress';
import { useSessionStore } from '@/store/session';

type Difficulty = SessionConfig['difficulty'];
type Mode = SessionConfig['mode'];
type Order = SessionConfig['order'];

export function generatePresetName(
    config: SessionConfig,
    categories: ManifestEntry[],
    resolveName: (slug: string, fallback?: string) => string = (_slug, fallback) =>
        fallback ?? _slug
): string {
    const catLabels = categories
        .filter((c) => config.categories.includes(c.slug))
        .map((c) => resolveName(c.slug, c.displayName));
    const catPart = catLabels.slice(0, 2).join('+') + (catLabels.length > 2 ? '+…' : '');
    return `${catPart} · ${config.difficulty} · ${config.questionCount}q`;
}

const MODE_KEY = {
    quiz: 'quiz',
    'bug-finding': 'bugFinding',
    'code-completion': 'codeCompletion'
} as const;

/**
 * Exact size of the pool a given difficulty+mode selection would draw from.
 * Both axes must come from the manifest matrix: multiplying the per-axis totals
 * invents questions that do not exist (and hides ones that do).
 */
export function getFilteredCategoryCount(
    cat: ManifestEntry,
    difficulty: Difficulty,
    mode: Mode
): number {
    if (mode === 'all') {
        return difficulty === 'all' ? cat.counts.total : cat.counts[difficulty];
    }

    const modeKey = MODE_KEY[mode];
    if (difficulty === 'all') return cat.counts[modeKey];

    return cat.matrix[difficulty][modeKey];
}

export function computeAvailableCount(
    categories: ManifestEntry[],
    selectedSlugs: string[],
    difficulty: Difficulty,
    mode: Mode
): number {
    if (selectedSlugs.length === 0) return 0;

    return categories
        .filter((cat) => selectedSlugs.includes(cat.slug))
        .reduce((total, cat) => total + getFilteredCategoryCount(cat, difficulty, mode), 0);
}

export function useSessionConfigurator(initialConfig?: SessionConfig) {
    const { data: categories = [], isLoading } = useCategories();
    const navigate = useNavigate();
    const setConfig = useSessionStore.use.setConfig();
    const savePreset = usePresetStore.use.savePreset();
    const errorRates = useProgressStore.use.errorRates();
    const getCategoryName = useCategoryDisplay();

    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        initialConfig?.categories ?? []
    );
    const [difficulty, setDifficulty] = useState<Difficulty>(initialConfig?.difficulty ?? 'all');
    const [mode, setMode] = useState<Mode>(initialConfig?.mode ?? 'all');
    const [questionCount, setQuestionCount] = useState<number>(initialConfig?.questionCount ?? 10);
    const [order, setOrder] = useState<Order>(initialConfig?.order ?? 'random');
    const [isCountEdited, setIsCountEdited] = useState(false);
    const [timerEnabled, setTimerEnabled] = useState<boolean>(initialConfig?.timerEnabled ?? false);

    const deferredSelectedCategories = useDeferredValue(selectedCategories);
    const deferredDifficulty = useDeferredValue(difficulty);
    const deferredMode = useDeferredValue(mode);

    const availableCount = useMemo(
        () =>
            computeAvailableCount(
                categories,
                deferredSelectedCategories,
                deferredDifficulty,
                deferredMode
            ),
        [categories, deferredSelectedCategories, deferredDifficulty, deferredMode]
    );

    const categoryCountMap = useMemo(
        () =>
            Object.fromEntries(
                categories.map((cat) => [
                    cat.slug,
                    getFilteredCategoryCount(cat, deferredDifficulty, deferredMode)
                ])
            ),
        [categories, deferredDifficulty, deferredMode]
    );

    const maxCount = useMemo(
        () => computeAvailableCount(categories, selectedCategories, difficulty, mode),
        [categories, selectedCategories, difficulty, mode]
    );

    // Until the user types a count, the offered session is the whole available pool.
    // Once they have typed one it is their choice: a selection or filter change may only
    // clamp it down to what still exists, never overwrite it with the new maximum.
    useEffect(() => {
        if (maxCount <= 0) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuestionCount((prev) => (isCountEdited ? Math.min(prev, maxCount) : maxCount));
    }, [maxCount, isCountEdited]);

    // P-3: use live maxCount (not deferred availableCount) so button state is always current
    const isStartEnabled = selectedCategories.length > 0 && maxCount > 0;

    const handleCategoryToggle = useCallback((slug: string) => {
        setSelectedCategories((prev) =>
            prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
        );
    }, []);

    const allSelected = categories.length > 0 && selectedCategories.length === categories.length;

    const handleSelectAll = useCallback(() => {
        setSelectedCategories(allSelected ? [] : categories.map((c) => c.slug));
    }, [allSelected, categories]);

    const handleDifficultyChange = useCallback((value: Difficulty) => {
        setDifficulty(value);
    }, []);

    const handleModeChange = useCallback((value: Mode) => {
        setMode(value);
    }, []);

    const handleQuestionCountChange = useCallback(
        (value: number) => {
            // P-4: guard against NaN (e.g. Number("-") or Number(""))
            if (isNaN(value)) return;
            setIsCountEdited(true);
            setQuestionCount(Math.max(1, Math.min(value, maxCount)));
        },
        [maxCount]
    );

    const handleOrderChange = useCallback((value: Order) => {
        setOrder(value);
    }, []);

    const toggleTimer = useCallback(() => {
        setTimerEnabled((prev) => !prev);
    }, []);

    const handleStart = useCallback(() => {
        if (!isStartEnabled) return;
        const config: SessionConfig = {
            categories: selectedCategories,
            // P-1: use live maxCount, not deferred availableCount
            questionCount: Math.min(questionCount, maxCount),
            difficulty,
            mode,
            order,
            timerEnabled
        };
        setConfig(config);
        navigate(RoutesPath.SessionPlay);
    }, [
        isStartEnabled,
        selectedCategories,
        questionCount,
        maxCount,
        difficulty,
        mode,
        order,
        timerEnabled,
        setConfig,
        navigate
    ]);

    const handleSavePreset = useCallback(() => {
        if (!isStartEnabled) return;
        const config: SessionConfig = {
            categories: selectedCategories,
            questionCount: Math.min(questionCount, maxCount),
            difficulty,
            mode,
            order,
            timerEnabled
        };
        const name = generatePresetName(config, categories, getCategoryName);
        savePreset(config, name);
    }, [
        isStartEnabled,
        selectedCategories,
        questionCount,
        maxCount,
        difficulty,
        mode,
        order,
        timerEnabled,
        categories,
        savePreset,
        getCategoryName
    ]);

    return {
        categories,
        isLoading,
        selectedCategories,
        difficulty,
        mode,
        questionCount,
        order,
        timerEnabled,
        availableCount,
        maxCount,
        categoryCountMap,
        errorRates,
        isStartEnabled,
        allSelected,
        handleCategoryToggle,
        handleSelectAll,
        handleDifficultyChange,
        handleModeChange,
        handleQuestionCountChange,
        handleOrderChange,
        toggleTimer,
        handleStart,
        handleSavePreset
    };
}
