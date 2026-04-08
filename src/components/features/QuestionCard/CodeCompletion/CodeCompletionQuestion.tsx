import { Fragment, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeBlock } from '@/components/common/CodeBlock';
import type { CodeCompletionQuestion as CodeCompletionQuestionData } from '@/lib/data/schema';
import { cn } from '@/lib/utils';

import { ExplanationPanel } from '../ExplanationPanel';
import { useCodeCompletionQuestion } from './useCodeCompletionQuestion';

interface Props {
    question: CodeCompletionQuestionData;
    onSubmitRegister: (submitFn: () => void) => void;
    onAllBlanksFilled: (filled: boolean) => void;
}

export const CodeCompletionQuestion: FC<Props> = ({
    question,
    onSubmitRegister,
    onAllBlanksFilled
}) => {
    const { t } = useTranslation('question');
    const { segments, blanksInput, isSubmitted, blankResults, onBlankChange } =
        useCodeCompletionQuestion({ question, onSubmitRegister, onAllBlanksFilled });

    return (
        <div className="flex flex-col gap-4">
            <div className="relative rounded-none border border-border bg-[#0d1117] font-mono text-sm">
                <div className="flex items-center border-b border-border px-3 py-1">
                    <span className="text-xs text-muted-foreground">
                        {question.lang ?? 'javascript'}
                    </span>
                </div>
                <pre className="m-0 overflow-x-auto whitespace-pre p-4">
                    {segments.map((segment, i) => (
                        <Fragment key={i}>
                            <span className="text-muted-foreground">{segment}</span>
                            {i < question.blanks.length && (
                                <input
                                    value={blanksInput[i]}
                                    onChange={(e) => onBlankChange(i, e.target.value)}
                                    disabled={isSubmitted}
                                    aria-label={t('codeCompletion.inputLabel', { index: i + 1 })}
                                    className={cn(
                                        'inline bg-transparent font-mono text-sm border-b-2 border-muted-foreground',
                                        'text-foreground outline-none min-w-[4ch] focus-visible:border-foreground',
                                        isSubmitted &&
                                            blankResults[i] === 'correct' &&
                                            'border-accent text-accent',
                                        isSubmitted &&
                                            blankResults[i] === 'incorrect' &&
                                            'border-error text-error'
                                    )}
                                    style={{
                                        width: `${Math.max(4, (blanksInput[i]?.length ?? 0) + 2)}ch`
                                    }}
                                />
                            )}
                        </Fragment>
                    ))}
                </pre>
            </div>

            {isSubmitted && blankResults.some((r) => r === 'incorrect') && (
                <ul className="text-xs space-y-1 mt-1">
                    {blankResults.map((result, i) =>
                        result === 'incorrect' ? (
                            <li key={i} className="text-error">
                                {t('codeCompletion.inputLabel', { index: i + 1 })}:{' '}
                                {t('codeCompletion.expected')} <code>{question.blanks[i]}</code>
                            </li>
                        ) : null
                    )}
                </ul>
            )}

            {isSubmitted && (
                <>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t('referenceSolution')}
                        </p>
                        <CodeBlock
                            code={question.referenceAnswer}
                            lang={question.lang ?? 'javascript'}
                        />
                    </div>
                    <ExplanationPanel explanation={question.explanation} />
                </>
            )}
        </div>
    );
};
