import type { FC } from 'react';

import type { SingleChoiceQuestion as SingleChoiceQuestionType } from '@/lib/data/schema';
import { useLocalized } from '@/lib/i18n/localized';

import { AnswerOption } from '../AnswerOption';
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

    return (
        <div className="flex flex-col gap-2">
            <div role="radiogroup" aria-label="Answer options">
                {displayOrder.map((originalIndex, displayIndex) => (
                    <AnswerOption
                        key={originalIndex}
                        index={displayIndex}
                        text={pick(question.options[originalIndex]!)}
                        isSelected={selectedIndex === originalIndex}
                        isAnswered={isAnswered}
                        isCorrect={question.correct === originalIndex}
                        isDisabled={isAnswered && selectedIndex !== originalIndex}
                        onSelect={() => onSelect(displayIndex)}
                    />
                ))}
            </div>
            {isAnswered && <ExplanationPanel explanation={pick(question.explanation)} />}
        </div>
    );
};
