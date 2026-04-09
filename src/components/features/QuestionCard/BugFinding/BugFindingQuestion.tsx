import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeBlock } from '@/components/common/CodeBlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BugFindingQuestion as BugFindingQuestionData } from '@/lib/data/schema';

import { AnswerOption } from '../AnswerOption';
import { ExplanationPanel } from '../ExplanationPanel';
import { useBugFindingQuestion } from './useBugFindingQuestion';

type SelfAssessment = 'gotIt' | 'missedIt';

interface Props {
    question: BugFindingQuestionData;
    isSkipped?: boolean;
    onSubmitRegister: (submitFn: () => void) => void;
    onSelfAssessRegister: (selfAssessFn: (result: SelfAssessment) => void) => void;
}

export const BugFindingQuestion: FC<Props> = ({
    question,
    isSkipped = false,
    onSubmitRegister,
    onSelfAssessRegister
}) => {
    const { t } = useTranslation('question');
    const {
        selectedOption,
        textAnswer,
        isSubmitted,
        selfAssessment,
        onSelectOption,
        onTextChange,
        onSelfAssess
    } = useBugFindingQuestion({ question, isSkipped, onSubmitRegister, onSelfAssessRegister });

    return (
        <div className="flex flex-col gap-4">
            <CodeBlock code={question.code} lang="javascript" />

            {question.options ? (
                <div role="group" aria-label="Answer options">
                    {question.options.map((option, index) => (
                        <AnswerOption
                            key={`${question.id}-${index}`}
                            index={index}
                            text={option}
                            variant="radio"
                            isSelected={selectedOption === index}
                            isAnswered={isSubmitted}
                            isCorrect={option === question.correct}
                            isMissed={false}
                            isDisabled={isSubmitted}
                            onSelect={() => onSelectOption(index)}
                        />
                    ))}
                </div>
            ) : (
                <Input
                    value={textAnswer}
                    onChange={(e) => onTextChange(e.target.value)}
                    disabled={isSubmitted}
                    placeholder={t('bugFinding.placeholder')}
                    aria-label={t('bugFinding.inputLabel')}
                />
            )}

            {isSubmitted && (
                <>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t('referenceSolution')}
                        </p>
                        <CodeBlock code={question.referenceAnswer} lang="javascript" />
                    </div>
                    <ExplanationPanel explanation={question.explanation} />

                    {selfAssessment === null && (
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => onSelfAssess('gotIt')}
                                className="flex-1 border-accent text-accent hover:bg-accent/10"
                            >
                                {t('gotIt')}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => onSelfAssess('missedIt')}
                                className="flex-1"
                            >
                                {t('missedIt')}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
