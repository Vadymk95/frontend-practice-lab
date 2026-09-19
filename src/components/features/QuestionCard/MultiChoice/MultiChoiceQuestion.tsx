import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { MultiChoiceQuestion as MultiChoiceQuestionData } from '@/lib/data/schema';
import { useLocalized } from '@/lib/i18n/localized';

import { AnswerOption } from '../AnswerOption';
import { AnswerVerdict } from '../AnswerVerdict';
import { ExplanationPanel } from '../ExplanationPanel';
import { useMultiChoiceQuestion } from './useMultiChoiceQuestion';

interface Props {
    question: MultiChoiceQuestionData;
    isSkipped?: boolean;
    onSelectionChange: (hasSelection: boolean) => void;
    onCheckRegister: (checkFn: () => void) => void;
    onSelectOptionRegister?: (selectFn: (idx: number) => void) => void;
}

export const MultiChoiceQuestion: FC<Props> = ({
    question,
    isSkipped = false,
    onSelectionChange,
    onCheckRegister,
    onSelectOptionRegister
}) => {
    const { selectedIndices, isChecked, onToggle, displayOrder } = useMultiChoiceQuestion(
        question,
        isSkipped,
        onSelectionChange,
        onCheckRegister,
        onSelectOptionRegister
    );
    const pick = useLocalized();
    const { t } = useTranslation('question');

    const foundCount = question.correct.filter((i) => selectedIndices.includes(i)).length;
    const status = !isChecked
        ? null
        : foundCount === question.correct.length &&
            selectedIndices.length === question.correct.length
          ? ('correct' as const)
          : ('incorrect' as const);
    const verdictLabel =
        status === 'incorrect'
            ? t('verdict.multiIncorrect', {
                  picked: foundCount,
                  total: question.correct.length
              })
            : status === 'correct'
              ? t('verdict.correct')
              : '';

    return (
        <div className="flex flex-col gap-2">
            {!isChecked && (
                <p className="text-base text-muted-foreground">{t('multiChoice.hint')}</p>
            )}
            <AnswerVerdict status={status} label={verdictLabel} />
            <div role="group" aria-label={t('answerOptionsLabel')}>
                {displayOrder.map((originalIndex, displayIndex) => {
                    const isSelected = selectedIndices.includes(originalIndex);
                    const isCorrectOption = question.correct.includes(originalIndex);
                    const isMissed = isChecked && isCorrectOption && !isSelected;

                    return (
                        <AnswerOption
                            key={`${question.id}-${originalIndex}`}
                            index={displayIndex}
                            text={pick(question.options[originalIndex]!)}
                            variant="checkbox"
                            isSelected={isSelected}
                            isAnswered={isChecked}
                            isCorrect={isCorrectOption}
                            isMissed={isMissed}
                            isDisabled={false}
                            isSkippedReveal={isSkipped}
                            onSelect={() => onToggle(displayIndex)}
                        />
                    );
                })}
            </div>
            {isChecked && <ExplanationPanel explanation={pick(question.explanation)} />}
        </div>
    );
};
