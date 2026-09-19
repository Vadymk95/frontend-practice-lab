import { Bookmark } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCategoryDisplay } from '@/hooks/data/useCategoryDisplay';
import type { SessionConfig } from '@/lib/storage/types';
import { cn } from '@/lib/utils';

import { useRovingRadioGroup } from './useRovingRadioGroup';
import { useSessionConfigurator } from './useSessionConfigurator';

type Difficulty = SessionConfig['difficulty'];
type Mode = SessionConfig['mode'];
type Order = SessionConfig['order'];

const HINT_ID = 'configurator-hint';

// Above this share of wrong answers a category is worth flagging on its tile.
const ERROR_RATE_BADGE_THRESHOLD = 0.3;

const DIFFICULTY_OPTIONS: Difficulty[] = ['all', 'easy', 'medium', 'hard'];
const MODE_OPTIONS: Mode[] = ['all', 'quiz', 'bug-finding', 'code-completion'];
const ORDER_OPTIONS: Order[] = ['random', 'sequential'];

interface SessionConfiguratorProps {
    initialConfig?: SessionConfig;
}

export const SessionConfigurator: FC<SessionConfiguratorProps> = ({ initialConfig }) => {
    const { t } = useTranslation('home');
    const getCategoryName = useCategoryDisplay();
    const {
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
    } = useSessionConfigurator(initialConfig);

    const difficultyRadioProps = useRovingRadioGroup(
        DIFFICULTY_OPTIONS,
        difficulty,
        handleDifficultyChange
    );
    const modeRadioProps = useRovingRadioGroup(MODE_OPTIONS, mode, handleModeChange);
    const orderRadioProps = useRovingRadioGroup(ORDER_OPTIONS, order, handleOrderChange);

    if (isLoading) {
        return (
            <div role="status" aria-live="polite">
                {t('configurator.loading')}
            </div>
        );
    }

    const hint =
        selectedCategories.length === 0
            ? t('configurator.hint.selectCategory')
            : availableCount === 0
              ? t('configurator.emptyState.message')
              : null;

    return (
        <div className="flex flex-col gap-6 pb-24 lg:pb-0">
            {/* Category Grid */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-medium text-foreground">
                        {t('configurator.categories.label')}
                    </h2>
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="min-h-11 px-1 text-sm text-accent-alt hover:underline"
                    >
                        {allSelected
                            ? t('configurator.categories.deselectAll')
                            : t('configurator.categories.selectAll')}
                    </button>
                </div>
                <TooltipProvider>
                    <div
                        role="group"
                        aria-label={t('configurator.categories.ariaLabel')}
                        aria-describedby={hint ? HINT_ID : undefined}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                    >
                        {categories.map((cat) => {
                            const count = categoryCountMap[cat.slug] ?? 0;
                            const errorRate = errorRates[cat.slug] ?? 0;
                            const showBadge = errorRate > ERROR_RATE_BADGE_THRESHOLD;
                            const errorPercent = Math.round(errorRate * 100);
                            return (
                                <Tooltip key={cat.slug}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            role="checkbox"
                                            aria-checked={selectedCategories.includes(cat.slug)}
                                            onClick={() => handleCategoryToggle(cat.slug)}
                                            className={cn(
                                                'min-h-11 px-3 py-2 text-base text-left border transition-colors flex items-center justify-between gap-1',
                                                selectedCategories.includes(cat.slug)
                                                    ? 'border-accent-alt bg-accent-alt/10 text-foreground'
                                                    : 'border-border bg-surface text-muted-foreground hover:border-accent-alt/50',
                                                count === 0 && 'opacity-50'
                                            )}
                                        >
                                            <span className="min-w-0 flex-1 hyphens-manual wrap-anywhere leading-tight">
                                                {getCategoryName(cat.slug, cat.displayName)}
                                            </span>
                                            <span className="flex items-center gap-1 shrink-0">
                                                {showBadge && (
                                                    <span
                                                        aria-label={t('errorRate.ariaLabel', {
                                                            percent: errorPercent
                                                        })}
                                                        title={t('errorRate.ariaLabel', {
                                                            percent: errorPercent
                                                        })}
                                                        className="bg-destructive/20 text-destructive text-xs px-1 rounded"
                                                    >
                                                        {t('errorRate.badge', {
                                                            percent: errorPercent
                                                        })}
                                                    </span>
                                                )}
                                                <span
                                                    aria-label={t(
                                                        'configurator.categories.countLabel',
                                                        { count }
                                                    )}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    {count}
                                                </span>
                                            </span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            {t('configurator.categories.countBreakdown.easy', {
                                                count: cat.counts.easy
                                            })}
                                        </p>
                                        <p>
                                            {t('configurator.categories.countBreakdown.medium', {
                                                count: cat.counts.medium
                                            })}
                                        </p>
                                        <p>
                                            {t('configurator.categories.countBreakdown.hard', {
                                                count: cat.counts.hard
                                            })}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </TooltipProvider>
            </section>

            {/* Difficulty Filter */}
            <section>
                <h2 className="text-base font-medium text-foreground mb-3">
                    {t('configurator.difficulty.label')}
                </h2>
                <div
                    role="radiogroup"
                    aria-label={t('configurator.difficulty.ariaLabel')}
                    className="flex gap-2"
                >
                    {DIFFICULTY_OPTIONS.map((d) => (
                        <button
                            key={d}
                            type="button"
                            role="radio"
                            aria-checked={difficulty === d}
                            onClick={() => handleDifficultyChange(d)}
                            {...difficultyRadioProps(d)}
                            className={`min-h-11 flex-1 py-2 text-base border transition-colors ${
                                difficulty === d
                                    ? 'border-accent-alt bg-accent-alt/10'
                                    : 'border-border'
                            }`}
                        >
                            {t(`configurator.difficulty.${d}`)}
                        </button>
                    ))}
                </div>
            </section>

            {/* Mode Filter */}
            <section>
                <h2 className="text-base font-medium text-foreground mb-3">
                    {t('configurator.mode.label')}
                </h2>
                <div
                    role="radiogroup"
                    aria-label={t('configurator.mode.ariaLabel')}
                    className="flex flex-wrap gap-2"
                >
                    {MODE_OPTIONS.map((m) => (
                        <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={mode === m}
                            onClick={() => handleModeChange(m)}
                            {...modeRadioProps(m)}
                            className={`min-h-11 px-3 py-2 text-base border transition-colors ${
                                mode === m ? 'border-accent-alt bg-accent-alt/10' : 'border-border'
                            }`}
                        >
                            {t(`configurator.mode.${m}`)}
                        </button>
                    ))}
                </div>
            </section>

            {/* Question Count */}
            <section>
                <h2
                    id="question-count-label"
                    className="text-base font-medium text-foreground mb-3"
                >
                    {t('configurator.count.label')}
                </h2>
                <Input
                    type="number"
                    aria-labelledby="question-count-label"
                    min={1}
                    max={maxCount > 0 ? maxCount : undefined}
                    value={questionCount}
                    onChange={(e) => handleQuestionCountChange(Number(e.target.value))}
                    className="w-24"
                    disabled={maxCount === 0}
                />
                {maxCount > 0 && (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {t('configurator.count.available', { count: availableCount })}
                    </p>
                )}
            </section>

            {/* Order Toggle */}
            <section>
                <h2 className="text-base font-medium text-foreground mb-3">
                    {t('configurator.order.label')}
                </h2>
                <div
                    role="radiogroup"
                    aria-label={t('configurator.order.ariaLabel')}
                    className="flex gap-2"
                >
                    {ORDER_OPTIONS.map((o) => (
                        <button
                            key={o}
                            type="button"
                            role="radio"
                            aria-checked={order === o}
                            onClick={() => handleOrderChange(o)}
                            {...orderRadioProps(o)}
                            className={`min-h-11 px-4 py-2 text-base border transition-colors ${
                                order === o ? 'border-accent-alt bg-accent-alt/10' : 'border-border'
                            }`}
                        >
                            {t(`configurator.order.${o}`)}
                        </button>
                    ))}
                </div>
            </section>

            {/* Timer Toggle */}
            <section>
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-medium text-foreground">
                        {t('configurator.timer')}
                    </h2>
                    <Switch
                        checked={timerEnabled}
                        onCheckedChange={toggleTimer}
                        aria-label={t('configurator.timer')}
                    />
                </div>
            </section>

            {/* One start bar for both layouts: fixed above the fold on a phone, inline on
                desktop. The hint lives in it so a disabled Start and its reason are always
                on screen together — and so the group describes an element that exists. */}
            <div className="fixed bottom-0 left-0 right-0 flex flex-col gap-2 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:flex-row lg:items-center lg:justify-end lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0">
                {hint && (
                    <p
                        id={HINT_ID}
                        aria-live="polite"
                        aria-atomic="true"
                        className="text-base text-muted-foreground lg:flex-1"
                    >
                        {hint}
                    </p>
                )}
                <div className="flex items-center gap-2">
                    {isStartEnabled && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSavePreset}
                            aria-label={t('configurator.savePreset')}
                            title={t('configurator.savePreset')}
                            className="min-h-11 min-w-11 text-base lg:w-auto lg:px-4"
                        >
                            <Bookmark size={18} aria-hidden="true" />
                            <span className="sr-only lg:not-sr-only">
                                {t('configurator.savePreset')}
                            </span>
                        </Button>
                    )}
                    {/* A disabled action must read as unavailable and stay legible: the
                        accent fill at half opacity kept the eye and lost the label. */}
                    <Button
                        className="min-h-11 flex-1 text-base disabled:bg-muted-foreground disabled:text-background disabled:opacity-100 lg:flex-none"
                        disabled={!isStartEnabled}
                        aria-describedby={hint ? HINT_ID : undefined}
                        onClick={handleStart}
                    >
                        {t('configurator.start')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
