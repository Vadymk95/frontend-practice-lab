import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const noop = () => {};
const noopSelfAssess = (_: (result: 'gotIt' | 'missedIt') => void) => {};
const noopAllFilled = (_: boolean) => {};

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
                <div
                    aria-label={t('progress.ariaLabel', {
                        current: currentIndex + 1,
                        total: questionCount
                    })}
                    className="text-sm text-muted-foreground"
                >
                    {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
                </div>
                <div className="flex items-center gap-2">
                    {!isAnswered && (
                        <Button variant="ghost" size="sm" onClick={handleSkip}>
                            {t('skip')}
                        </Button>
                    )}
                    {isAnswered && !isSkipped && (
                        <Button variant="ghost" size="sm" onClick={onBack}>
                            {t('back')}
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{question.category}</Badge>
                <Badge variant="outline">{t(`difficulty.${question.difficulty}`)}</Badge>
            </div>
            <h2 className="text-base font-medium">{pick(question.question)}</h2>
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
