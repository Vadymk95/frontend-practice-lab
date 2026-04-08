import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const noop = () => {};
const noopSelfAssess = (_: (result: 'gotIt' | 'missedIt') => void) => {};
const noopAllFilled = (_: boolean) => {};

import { Badge } from '@/components/ui/badge';

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
}

export const QuestionCard: FC<QuestionCardProps> = ({
    onSelectionChange,
    onCheckRegister,
    onSubmitRegister,
    onSelfAssessRegister,
    onAllBlanksFilled
}) => {
    const { t } = useTranslation('question');
    const { question, currentIndex, questionCount } = useQuestionCard();

    if (!question) return null;

    return (
        <article className="flex flex-col gap-4">
            <div
                aria-label={t('progress.ariaLabel', {
                    current: currentIndex + 1,
                    total: questionCount
                })}
                className="text-sm text-muted-foreground"
            >
                {t('progress.indicator', { current: currentIndex + 1, total: questionCount })}
            </div>
            <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{question.category}</Badge>
                <Badge variant="outline">{t(`difficulty.${question.difficulty}`)}</Badge>
            </div>
            <h2 className="text-base font-medium">{question.question}</h2>
            {question.type === 'single-choice' && <SingleChoiceQuestion question={question} />}
            {question.type === 'multi-choice' && (
                <MultiChoiceQuestion
                    question={question}
                    onSelectionChange={onSelectionChange ?? (() => {})}
                    onCheckRegister={onCheckRegister ?? (() => {})}
                />
            )}
            {question.type === 'bug-finding' && (
                <BugFindingQuestion
                    question={question}
                    onSubmitRegister={onSubmitRegister ?? noop}
                    onSelfAssessRegister={onSelfAssessRegister ?? noopSelfAssess}
                />
            )}
            {question.type === 'code-completion' && (
                <CodeCompletionQuestion
                    question={question}
                    onSubmitRegister={onSubmitRegister ?? noop}
                    onAllBlanksFilled={onAllBlanksFilled ?? noopAllFilled}
                />
            )}
        </article>
    );
};
