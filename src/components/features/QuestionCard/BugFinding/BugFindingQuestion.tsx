import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeBlock } from '@/components/common/CodeBlock';
import { MarkdownBlocks } from '@/components/common/InlineMarkdown';
import { Button } from '@/components/ui/button';
import type { BugFindingQuestion as BugFindingQuestionData } from '@/lib/data/schema';
import { useLocalized } from '@/lib/i18n/localized';
import { cn } from '@/lib/utils';

import { AnswerOption } from '../AnswerOption';
import { ExplanationPanel } from '../ExplanationPanel';
import { useReferenceAnswer } from '../referenceAnswer';
import { useBugFindingQuestion } from './useBugFindingQuestion';

const DEFAULT_SNIPPET_LANG = 'javascript';

type SelfAssessment = 'gotIt' | 'missedIt';

interface Props {
    question: BugFindingQuestionData;
    isSkipped?: boolean;
    onSubmitRegister: (submitFn: () => void) => void;
    onSelfAssessRegister: (selfAssessFn: (result: SelfAssessment) => void) => void;
    onCanSubmitChange?: (canSubmit: boolean) => void;
}

export const BugFindingQuestion: FC<Props> = ({
    question,
    isSkipped = false,
    onSubmitRegister,
    onSelfAssessRegister,
    onCanSubmitChange
}) => {
    const { t } = useTranslation('question');
    const pick = useLocalized();
    const pickReference = useReferenceAnswer();
    const {
        selectedOption,
        textAnswer,
        isSubmitted,
        selfAssessment,
        onSelectOption,
        onTextChange,
        onSelfAssess
    } = useBugFindingQuestion({
        question,
        isSkipped,
        onSubmitRegister,
        onSelfAssessRegister,
        onCanSubmitChange
    });

    return (
        <div className="flex flex-col gap-4">
            <CodeBlock code={question.code} lang={question.lang ?? DEFAULT_SNIPPET_LANG} />

            {question.options ? (
                <div role="group" aria-label="Answer options">
                    {question.options.map((option, index) => (
                        <AnswerOption
                            key={`${question.id}-${index}`}
                            index={index}
                            text={pick(option)}
                            variant="radio"
                            isSelected={selectedOption === index}
                            isAnswered={isSubmitted}
                            isCorrect={
                                typeof question.correct === 'number' && question.correct === index
                            }
                            isMissed={false}
                            isDisabled={isSubmitted}
                            onSelect={() => onSelectOption(index)}
                        />
                    ))}
                </div>
            ) : (
                <textarea
                    value={textAnswer}
                    onChange={(e) => onTextChange(e.target.value)}
                    disabled={isSubmitted}
                    rows={3}
                    placeholder={t('bugFinding.placeholder')}
                    aria-label={t('bugFinding.inputLabel')}
                    className={cn(
                        'w-full resize-y border border-border bg-transparent px-3 py-2 text-sm',
                        'field-sizing-content outline-none focus-visible:border-foreground',
                        'disabled:cursor-not-allowed disabled:opacity-60'
                    )}
                />
            )}

            {isSubmitted && (
                <>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t('referenceSolution')}
                        </p>
                        <MarkdownBlocks
                            text={pickReference(question.referenceAnswer)}
                            lang={question.lang ?? DEFAULT_SNIPPET_LANG}
                        />
                    </div>
                    <ExplanationPanel explanation={pick(question.explanation)} />

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
