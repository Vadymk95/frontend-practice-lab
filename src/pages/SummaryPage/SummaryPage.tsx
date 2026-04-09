import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import { useSummaryPage } from './useSummaryPage';

export const SummaryPage: FC = () => {
    const { t } = useTranslation('summary');
    const {
        correctCount,
        totalCount,
        pureWrongCount,
        skippedCount,
        allMistakesCount,
        weakTopics,
        isPerfectScore,
        streak,
        isStreakReset,
        handleRepeatWrong,
        handleRepeatSkipped,
        handleRepeatAllMistakes,
        handleRestartSession,
        handleHome
    } = useSummaryPage();

    // During redirect (questionList empty), render nothing
    if (totalCount === 0) return null;

    return (
        <div className="flex flex-col gap-6 max-w-md mx-auto py-8 px-4">
            {/* Score */}
            <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('score.label')}</p>
                <p className="text-5xl font-bold tabular-nums">
                    {t('score.display', { correct: correctCount, total: totalCount })}
                </p>
                {isPerfectScore && <p className="mt-2 text-accent font-medium">{t('perfect')}</p>}
                {skippedCount > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t('skipped', { count: skippedCount })}
                    </p>
                )}
            </div>

            {/* Streak */}
            {streak.current > 0 && (
                <div className="text-center">
                    {isStreakReset ? (
                        <p className="text-sm text-muted-foreground">{t('streak.newStart')}</p>
                    ) : (
                        <p className="text-sm font-medium">
                            {t('streak.count', { count: streak.current })}
                        </p>
                    )}
                </div>
            )}

            {/* Weak topics */}
            {!isPerfectScore && (
                <div>
                    <p className="text-sm font-medium mb-2">{t('weakTopics.title')}</p>
                    {weakTopics.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('weakTopics.empty')}</p>
                    ) : (
                        <ul className="flex flex-wrap gap-2">
                            {weakTopics.map((topic) => (
                                <li
                                    key={topic}
                                    className="px-3 py-1 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                                >
                                    {topic}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 mt-2">
                {isPerfectScore ? (
                    <>
                        <Button onClick={handleRestartSession} variant="default">
                            {t('actions.tryAgain')}
                        </Button>
                        <Button onClick={handleHome} variant="secondary">
                            {t('actions.trySomethingElse')}
                        </Button>
                    </>
                ) : (
                    <>
                        {pureWrongCount > 0 && skippedCount > 0 && (
                            <Button onClick={handleRepeatAllMistakes} variant="default">
                                {t('actions.repeatAllMistakes', { count: allMistakesCount })}
                            </Button>
                        )}
                        {pureWrongCount > 0 && (
                            <Button
                                onClick={handleRepeatWrong}
                                variant={skippedCount > 0 ? 'secondary' : 'default'}
                            >
                                {t('actions.repeatWrong', { count: pureWrongCount })}
                            </Button>
                        )}
                        {skippedCount > 0 && (
                            <Button
                                onClick={handleRepeatSkipped}
                                variant={pureWrongCount > 0 ? 'secondary' : 'default'}
                            >
                                {t('actions.repeatSkipped', { count: skippedCount })}
                            </Button>
                        )}
                        <Button onClick={handleRestartSession} variant="outline">
                            {t('actions.restart')}
                        </Button>
                    </>
                )}
                <Button onClick={handleHome} variant="ghost">
                    {t('actions.home')}
                </Button>
            </div>
        </div>
    );
};

export default SummaryPage;
