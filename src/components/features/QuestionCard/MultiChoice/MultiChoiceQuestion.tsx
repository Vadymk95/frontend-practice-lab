import type { FC } from 'react';

import type { MultiChoiceQuestion as MultiChoiceQuestionData } from '@/lib/data/schema';

import { AnswerOption } from '../AnswerOption';
import { ExplanationPanel } from '../ExplanationPanel';
import { useMultiChoiceQuestion } from './useMultiChoiceQuestion';

interface Props {
    question: MultiChoiceQuestionData;
    isSkipped?: boolean;
    onSelectionChange: (hasSelection: boolean) => void;
    onCheckRegister: (checkFn: () => void) => void;
}

export const MultiChoiceQuestion: FC<Props> = ({
    question,
    isSkipped = false,
    onSelectionChange,
    onCheckRegister
}) => {
    const { selectedIndices, isChecked, onToggle } = useMultiChoiceQuestion(
        question,
        isSkipped,
        onSelectionChange,
        onCheckRegister
    );

    return (
        <div className="flex flex-col gap-2">
            <div role="group" aria-label="Answer options">
                {question.options.map((option, index) => {
                    const isSelected = selectedIndices.includes(index);
                    const isCorrectOption = question.correct.includes(index);
                    const isMissed = isChecked && isCorrectOption && !isSelected;

                    return (
                        <AnswerOption
                            key={`${question.id}-${index}`}
                            index={index}
                            text={option}
                            variant="checkbox"
                            isSelected={isSelected}
                            isAnswered={isChecked}
                            isCorrect={isCorrectOption}
                            isMissed={isMissed}
                            isDisabled={false}
                            onSelect={() => onToggle(index)}
                        />
                    );
                })}
            </div>
            {isChecked && <ExplanationPanel explanation={question.explanation} />}
        </div>
    );
};
