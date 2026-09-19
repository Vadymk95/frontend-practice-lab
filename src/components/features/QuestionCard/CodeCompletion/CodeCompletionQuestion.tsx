import { Fragment, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { MarkdownBlocks } from '@/components/common/InlineMarkdown';
import type { CodeCompletionQuestion as CodeCompletionQuestionData } from '@/lib/data/schema';
import { useLocalized } from '@/lib/i18n/localized';
import { cn } from '@/lib/utils';

import { AnswerVerdict } from '../AnswerVerdict';
import { ExplanationPanel } from '../ExplanationPanel';
import { useReferenceAnswer } from '../referenceAnswer';
import { useCodeCompletionQuestion } from './useCodeCompletionQuestion';

const DEFAULT_SNIPPET_LANG = 'javascript';
const ENTER_KEY = 'Enter';
/** Wide enough to stay a 44px-class tap target on a phone. */
const MIN_BLANK_WIDTH_CH = 6;

interface Props {
    question: CodeCompletionQuestionData;
    isSkipped?: boolean;
    onSubmitRegister: (submitFn: () => void) => void;
    onAllBlanksFilled: (filled: boolean) => void;
}

export const CodeCompletionQuestion: FC<Props> = ({
    question,
    isSkipped = false,
    onSubmitRegister,
    onAllBlanksFilled
}) => {
    const { t } = useTranslation('question');
    const pick = useLocalized();
    const pickReference = useReferenceAnswer();
    const { segments, blanksInput, isSubmitted, blankResults, onBlankChange, onSubmit } =
        useCodeCompletionQuestion({ question, isSkipped, onSubmitRegister, onAllBlanksFilled });
    // A skipped question reveals the blanks instead of grading them, so it gets no verdict.
    const status =
        isSkipped || !isSubmitted || blankResults.length === 0
            ? null
            : blankResults.every((r) => r === 'correct')
              ? ('correct' as const)
              : ('incorrect' as const);

    return (
        <div className="flex flex-col gap-4">
            <AnswerVerdict status={status} label={status === null ? '' : t(`verdict.${status}`)} />
            <div className="relative rounded-none border border-border bg-white font-mono text-sm dark:bg-[#0d1117]">
                <div className="flex items-center border-b border-border px-3 py-1">
                    <span className="text-xs text-muted-foreground">
                        {question.lang ?? DEFAULT_SNIPPET_LANG}
                    </span>
                </div>
                <pre className="m-0 overflow-x-auto bg-white p-4 whitespace-pre-wrap dark:bg-[#0d1117]">
                    {segments.map((segment, i) => (
                        <Fragment key={i}>
                            <span className="text-muted-foreground">{segment}</span>
                            {i < question.blanks.length && (
                                <input
                                    value={blanksInput[i]}
                                    onChange={(e) => onBlankChange(i, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === ENTER_KEY) {
                                            e.preventDefault();
                                            onSubmit();
                                        }
                                    }}
                                    disabled={isSubmitted}
                                    aria-label={t('codeCompletion.inputLabel', { index: i + 1 })}
                                    // Phone keyboards substitute smart quotes and autocorrect
                                    // identifiers, both of which change the typed answer.
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    autoComplete="off"
                                    spellCheck={false}
                                    enterKeyHint="done"
                                    className={cn(
                                        'inline bg-transparent font-mono text-base border-b-2 border-muted-foreground',
                                        'text-foreground outline-none min-h-11 min-w-[6ch] px-1 focus-visible:border-foreground',
                                        isSubmitted &&
                                            !isSkipped &&
                                            blankResults[i] === 'correct' &&
                                            'border-accent text-accent',
                                        isSubmitted &&
                                            !isSkipped &&
                                            blankResults[i] === 'incorrect' &&
                                            'border-error text-error',
                                        isSkipped && 'border-warning border-dashed'
                                    )}
                                    style={{
                                        width: `${Math.max(MIN_BLANK_WIDTH_CH, (blanksInput[i]?.length ?? 0) + 2)}ch`
                                    }}
                                />
                            )}
                        </Fragment>
                    ))}
                </pre>
            </div>

            {isSubmitted && !isSkipped && blankResults.length > 0 && (
                <ul className="text-base space-y-1 mt-1">
                    {blankResults.map((result, i) => (
                        <li key={i} className={result === 'correct' ? 'text-accent' : 'text-error'}>
                            <span aria-hidden="true">{result === 'correct' ? '✓' : '✗'}</span>{' '}
                            {t('codeCompletion.inputLabel', { index: i + 1 })}:{' '}
                            {result === 'correct' ? (
                                t('verdict.correct')
                            ) : (
                                <>
                                    {t('codeCompletion.expected')} <code>{question.blanks[i]}</code>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
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
                </>
            )}
        </div>
    );
};
