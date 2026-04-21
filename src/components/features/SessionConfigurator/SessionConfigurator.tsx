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

import { useSessionConfigurator } from './useSessionConfigurator';

type Difficulty = SessionConfig['difficulty'];
type Mode = SessionConfig['mode'];
type Order = SessionConfig['order'];

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

    if (isLoading) {
        return (
            <div role="status" aria-live="polite">
                {t('configurator.loading')}
            </div>
        );
    }

    const difficultyOptions: Difficulty[] = ['all', 'easy', 'medium', 'hard'];
    const modeOptions: Mode[] = ['quiz', 'bug-finding', 'code-completion', 'all'];
    const orderOptions: Order[] = ['random', 'sequential'];

    return (
        <div className="flex flex-col gap-6 pb-24 lg:pb-0">
            {/* Category Grid */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium text-foreground">
                        {t('configurator.categories.label')}
                    </h2>
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs text-accent-alt hover:underline"
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
                        aria-describedby="configurator-hint"
                        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                    >
                        {categories.map((cat) => {
                            const count = categoryCountMap[cat.slug] ?? 0;
                            const errorRate = errorRates[cat.slug] ?? 0;
                            const showBadge = errorRate > 0.3;
                            return (
                                <Tooltip key={cat.slug}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            role="checkbox"
                                            aria-checked={selectedCategories.includes(cat.slug)}
                                            onClick={() => handleCategoryToggle(cat.slug)}
                                            className={cn(
                                                'min-h-11 px-3 py-2 text-sm text-left border transition-colors flex items-center justify-between gap-1',
                                                selectedCategories.includes(cat.slug)
                                                    ? 'border-accent-alt bg-accent-alt/10 text-primary'
                                                    : 'border-border bg-surface text-muted-foreground hover:border-accent-alt/50',
                                                count === 0 && 'opacity-50'
                                            )}
                                        >
                                            <span>
                                                {getCategoryName(cat.slug, cat.displayName)}
                                            </span>
                                            <span className="flex items-center gap-1 shrink-0">
                                                {showBadge && (
                                                    <span className="bg-destructive/20 text-destructive text-[10px] px-1 rounded">
                                                        {Math.round(errorRate * 100)}%
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
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
                <h2 className="text-sm font-medium text-foreground mb-3">
                    {t('configurator.difficulty.label')}
                </h2>
                <div
                    role="radiogroup"
                    aria-label={t('configurator.difficulty.ariaLabel')}
                    className="flex gap-2"
                >
                    {difficultyOptions.map((d) => (
                        <button
                            key={d}
                            type="button"
                            role="radio"
                            aria-checked={difficulty === d}
                            onClick={() => handleDifficultyChange(d)}
                            className={`flex-1 py-2 text-sm border transition-colors ${
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
                <h2 className="text-sm font-medium text-foreground mb-3">
                    {t('configurator.mode.label')}
                </h2>
                <div
                    role="radiogroup"
                    aria-label={t('configurator.mode.ariaLabel')}
                    className="flex flex-wrap gap-2"
                >
                    {modeOptions.map((m) => (
                        <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={mode === m}
                            onClick={() => handleModeChange(m)}
                            className={`px-3 py-2 text-sm border transition-colors ${
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
                <h2 id="question-count-label" className="text-sm font-medium text-foreground mb-3">
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
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        {t('configurator.count.available', { count: availableCount })}
                    </p>
                )}
            </section>

            {/* Order Toggle */}
            <section>
                <h2 className="text-sm font-medium text-foreground mb-3">
                    {t('configurator.order.label')}
                </h2>
                <div
                    role="radiogroup"
                    aria-label={t('configurator.order.ariaLabel')}
                    className="flex gap-2"
                >
                    {orderOptions.map((o) => (
                        <button
                            key={o}
                            type="button"
                            role="radio"
                            aria-checked={order === o}
                            onClick={() => handleOrderChange(o)}
                            className={`px-4 py-2 text-sm border transition-colors ${
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
                    <h2 className="text-sm font-medium text-foreground">
                        {t('configurator.timer')}
                    </h2>
                    <Switch
                        checked={timerEnabled}
                        onCheckedChange={toggleTimer}
                        aria-label={t('configurator.timer')}
                    />
                </div>
            </section>

            {/* State messages: only shown when something requires user attention */}
            {(selectedCategories.length === 0 || availableCount === 0) && (
                <div
                    id="configurator-hint"
                    aria-live="polite"
                    aria-atomic="true"
                    className="text-sm text-muted-foreground"
                >
                    {selectedCategories.length === 0
                        ? t('configurator.hint.selectCategory')
                        : t('configurator.emptyState.message')}
                </div>
            )}

            {/* Sticky Start Button (mobile) — icon-only Save preset keeps Start dominant */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2 lg:hidden">
                {isStartEnabled && (
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSavePreset}
                        aria-label={t('configurator.savePreset')}
                        title={t('configurator.savePreset')}
                    >
                        <Bookmark size={18} aria-hidden="true" />
                    </Button>
                )}
                <Button className="flex-1" disabled={!isStartEnabled} onClick={handleStart}>
                    {t('configurator.start')}
                </Button>
            </div>

            {/* Inline Start Button (desktop) */}
            <div className="hidden lg:flex lg:justify-end lg:gap-2">
                {isStartEnabled && (
                    <Button variant="outline" onClick={handleSavePreset}>
                        {t('configurator.savePreset')}
                    </Button>
                )}
                <Button disabled={!isStartEnabled} onClick={handleStart}>
                    {t('configurator.start')}
                </Button>
            </div>
        </div>
    );
};
