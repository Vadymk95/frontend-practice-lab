import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_SNIPPET_LANG = 'javascript';

const noop = () => {};
const noopSelfAssess = (_: (result: 'gotIt' | 'missedIt') => void) => {};
const noopAllFilled = (_: boolean) => {};

import { CodeBlock } from '@/components/common/CodeBlock';
import { InlineMarkdown } from '@/components/common/InlineMarkdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCategoryDisplay } from '@/hooks/data/useCategoryDisplay';
import { useLocalized } from '@/lib/i18n/localized';

import { BugFindingQuestion } from './BugFinding';
import { CodeCompletionQuestion } from './CodeCompletion';
import { MultiChoiceQuestion } from './MultiChoice';
import { SingleChoiceQuestion } from './SingleChoice';
import { useQuestionCard } from './useQuestionCard';

interface QuestionCardProps {
    onSelectionChange?: (hasSelection: boolean) => void;
    onCheckRegister?: (checkFn: () => void) => void;
    onSubmitRegister?: (submitFn: () => void) => void;
    onSelfAssessRegister?: (selfAssessFn: (result: 'gotIt' | 'missedIt') => void) => void;
    onAllBlanksFilled?: (filled: boolean) => void;
    onBugFindingCanSubmit?: (canSubmit: boolean) => void;
    onSelectOptionRegister?: (selectFn: (idx: number) => void) => void;
}

export const QuestionCard: FC<QuestionCardProps> = ({
    onSelectionChange,
    onCheckRegister,
    onSubmitRegister,
    onSelfAssessRegister,
    onAllBlanksFilled,
    onBugFindingCanSubmit,
    onSelectOptionRegister
}) => {
    const { t } = useTranslation('question');
    const pick = useLocalized();
    const getCategoryName = useCategoryDisplay();
    const { question, currentIndex, questionCount, isAnswered, handleBack, isSkipped, handleSkip } =
        useQuestionCard();
    const [resetKey, setResetKey] = useState(0);

    const onBack = useCallback(() => {
        handleBack();
        setResetKey((k) => k + 1);
    }, [handleBack]);

    if (!question) return null;

    return (
        <article className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div aria-hidden="true" className="text-sm text-muted-foreground">
                    {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
                </div>
                {/* The visible counter reads as "3 / 29" out loud, which says nothing; the
                    spelled-out question number is what a reader needs on every card change. */}
                <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                    {t('progress.ariaLabel', {
                        current: currentIndex + 1,
                        total: questionCount
                    })}
                </div>
                <div className="flex items-center gap-2">
                    {/* A phone tap target is 44px; the pointer-driven layout keeps the compact height. */}
                    {!isAnswered && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11 lg:min-h-9"
                            onClick={handleSkip}
                        >
                            {t('skip')}
                        </Button>
                    )}
                    {isAnswered && !isSkipped && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11 lg:min-h-9"
                            onClick={onBack}
                        >
                            {t('back')}
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{getCategoryName(question.category)}</Badge>
                <Badge variant="outline">{t(`difficulty.${question.difficulty}`)}</Badge>
                {isSkipped && (
                    <Badge variant="outline" className="border-warning text-warning">
                        {t('skippedBadge')}
                    </Badge>
                )}
            </div>
            <h2 className="text-base font-medium">
                <InlineMarkdown text={pick(question.question)} />
            </h2>
            {question.code &&
                (question.type === 'single-choice' || question.type === 'multi-choice') && (
                    <CodeBlock code={question.code} lang={question.lang ?? DEFAULT_SNIPPET_LANG} />
                )}
            {question.type === 'single-choice' && (
                <SingleChoiceQuestion
                    key={resetKey}
                    question={question}
                    isSkipped={isSkipped}
                    onSelectOptionRegister={onSelectOptionRegister}
                />
            )}
            {question.type === 'multi-choice' && (
                <MultiChoiceQuestion
                    key={resetKey}
                    question={question}
                    isSkipped={isSkipped}
                    onSelectionChange={onSelectionChange ?? (() => {})}
                    onCheckRegister={onCheckRegister ?? (() => {})}
                    onSelectOptionRegister={onSelectOptionRegister}
                />
            )}
            {question.type === 'bug-finding' && (
                <BugFindingQuestion
                    key={resetKey}
                    question={question}
                    isSkipped={isSkipped}
                    onSubmitRegister={onSubmitRegister ?? noop}
                    onSelfAssessRegister={onSelfAssessRegister ?? noopSelfAssess}
                    onCanSubmitChange={onBugFindingCanSubmit}
                />
            )}
            {question.type === 'code-completion' && (
                <CodeCompletionQuestion
                    key={resetKey}
                    question={question}
                    isSkipped={isSkipped}
                    onSubmitRegister={onSubmitRegister ?? noop}
                    onAllBlanksFilled={onAllBlanksFilled ?? noopAllFilled}
                />
            )}
        </article>
    );
};
