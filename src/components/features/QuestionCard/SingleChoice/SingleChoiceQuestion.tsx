import type { FC } from 'react';

import type { SingleChoiceQuestion as SingleChoiceQuestionType } from '@/lib/data/schema';

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
    const { selectedIndex, isAnswered, onSelect } = useSingleChoiceQuestion(
        question,
        isSkipped,
        onSelectOptionRegister
    );

    return (
        <div className="flex flex-col gap-2">
            <div role="radiogroup" aria-label="Answer options">
                {question.options.map((option, index) => (
                    <AnswerOption
                        key={index}
                        index={index}
                        text={option}
                        isSelected={selectedIndex === index}
                        isAnswered={isAnswered}
                        isCorrect={question.correct === index}
                        isDisabled={isAnswered && selectedIndex !== index}
                        onSelect={() => onSelect(index)}
                    />
                ))}
            </div>
            {isAnswered && <ExplanationPanel explanation={question.explanation} />}
        </div>
    );
};
