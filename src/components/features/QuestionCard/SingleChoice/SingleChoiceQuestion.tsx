import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { SingleChoiceQuestion as SingleChoiceQuestionType } from '@/lib/data/schema';
import { useLocalized } from '@/lib/i18n/localized';

import { AnswerOption } from '../AnswerOption';
import { AnswerVerdict } from '../AnswerVerdict';
import { ExplanationPanel } from '../ExplanationPanel';
import { useSingleChoiceQuestion } from './useSingleChoiceQuestion';

interface Props {
    question: SingleChoiceQuestionType;
    isSkipped?: boolean;
    onSelectOptionRegister?: (selectFn: (idx: number) => void) => void;
}

export const SingleChoiceQuestion: FC<Props> = ({
    question,
    isSkipped = false,
    onSelectOptionRegister
}) => {
    const { selectedIndex, isAnswered, onSelect, displayOrder } = useSingleChoiceQuestion(
        question,
        isSkipped,
        onSelectOptionRegister
    );
    const pick = useLocalized();
    const { t } = useTranslation('question');
    // A skipped question is revealed, not graded, so it gets no verdict.
    const status =
        isSkipped || selectedIndex === null
            ? null
            : selectedIndex === question.correct
              ? ('correct' as const)
              : ('incorrect' as const);

    return (
        <div className="flex flex-col gap-2">
            <AnswerVerdict status={status} label={status === null ? '' : t(`verdict.${status}`)} />
            <div role="radiogroup" aria-label={t('answerOptionsLabel')}>
                {displayOrder.map((originalIndex, displayIndex) => (
                    <AnswerOption
                        key={originalIndex}
                        index={displayIndex}
                        text={pick(question.options[originalIndex]!)}
                        isSelected={selectedIndex === originalIndex}
                        isAnswered={isAnswered}
                        isCorrect={question.correct === originalIndex}
                        isDisabled={isAnswered && selectedIndex !== originalIndex}
                        isSkippedReveal={isSkipped}
                        onSelect={() => onSelect(displayIndex)}
                    />
                ))}
            </div>
            {isAnswered && <ExplanationPanel explanation={pick(question.explanation)} />}
        </div>
    );
};
