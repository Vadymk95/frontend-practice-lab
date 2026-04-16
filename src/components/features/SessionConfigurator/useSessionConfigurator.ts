import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ManifestEntry } from '@/hooks/data/useCategories';
import { useCategories } from '@/hooks/data/useCategories';
import type { SessionConfig } from '@/lib/storage/types';
import { RoutesPath } from '@/router/routes';
import { usePresetStore } from '@/store/presets';
import { useProgressStore } from '@/store/progress';
import { useSessionStore } from '@/store/session';

type Difficulty = SessionConfig['difficulty'];
type Mode = SessionConfig['mode'];
type Order = SessionConfig['order'];

export function generatePresetName(config: SessionConfig, categories: ManifestEntry[]): string {
    const catLabels = categories
        .filter((c) => config.categories.includes(c.slug))
        .map((c) => c.displayName);
    const catPart = catLabels.slice(0, 2).join('+') + (catLabels.length > 2 ? '+…' : '');
    return `${catPart} · ${config.difficulty} · ${config.questionCount}q`;
}

export function getFilteredCategoryCount(
    cat: ManifestEntry,
    difficulty: Difficulty,
    mode: Mode
): number {
    let diffCount: number;
    if (difficulty === 'all') {
        diffCount = cat.counts.total;
    } else {
        diffCount = cat.counts[difficulty];
    }

    if (mode === 'all') return diffCount;

    const modeTotal =
        mode === 'quiz'
            ? cat.counts.quiz
            : mode === 'bug-finding'
              ? cat.counts.bugFinding
              : cat.counts.codeCompletion;

    if (cat.counts.total === 0) return 0;
    return Math.round(diffCount * (modeTotal / cat.counts.total));
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

    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        initialConfig?.categories ?? []
    );
    const [difficulty, setDifficulty] = useState<Difficulty>(initialConfig?.difficulty ?? 'all');
    const [mode, setMode] = useState<Mode>(initialConfig?.mode ?? 'all');
    const [questionCount, setQuestionCount] = useState<number>(initialConfig?.questionCount ?? 10);
    const [order, setOrder] = useState<Order>(initialConfig?.order ?? 'random');
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

    // P-2: auto-clamp questionCount when maxCount drops below current value
    useEffect(() => {
        if (maxCount > 0) {
            setQuestionCount((prev) => Math.min(prev, maxCount));
        }
    }, [maxCount]);

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
        const name = generatePresetName(config, categories);
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
        savePreset
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
