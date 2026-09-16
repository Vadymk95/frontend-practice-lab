import type { FC } from 'react';

import type { MultiChoiceQuestion as MultiChoiceQuestionData } from '@/lib/data/schema';
import { useLocalized } from '@/lib/i18n/localized';

import { AnswerOption } from '../AnswerOption';
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

    return (
        <div className="flex flex-col gap-2">
            <div role="group" aria-label="Answer options">
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
                            onSelect={() => onToggle(displayIndex)}
                        />
                    );
                })}
            </div>
            {isChecked && <ExplanationPanel explanation={pick(question.explanation)} />}
        </div>
    );
};
