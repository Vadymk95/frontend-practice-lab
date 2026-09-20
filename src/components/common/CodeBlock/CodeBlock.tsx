import { Check, Copy } from 'lucide-react';
import { useId, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { useCodeBlock } from './useCodeBlock';

interface CodeBlockProps {
    code: string;
    lang?: string;
    className?: string;
}

export const CodeBlock: FC<CodeBlockProps> = ({ code, lang = 'javascript', className }) => {
    const { t } = useTranslation('common');
    const langLabelId = useId();
    const { highlightedHtml, isCopied, onCopy } = useCodeBlock({ code, lang });

    return (
        <div
            className={cn(
                'relative rounded-none border border-border bg-white font-mono text-sm dark:bg-[#0d1117]',
                className
            )}
        >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-border px-3 py-1">
                <span id={langLabelId} className="text-xs text-muted-foreground">
                    {lang}
                </span>
                <button
                    type="button"
                    aria-label={isCopied ? t('copied') : t('copy')}
                    onClick={onCopy}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isCopied ? t('copied') : t('copy')}
                </button>
            </div>

            {/* Code area — a scrollable region is a tab stop, otherwise the clipped part is
                unreachable without a pointer. No height clamp on the phone: the page already
                scrolls, and a nested vertical scroller there is worse than a long card. */}
            <div
                role="region"
                aria-labelledby={langLabelId}
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable, or its clipped content is pointer-only (WCAG 2.1.1)
                tabIndex={0}
                className="code-scroll overflow-auto bg-white md:max-h-[480px] dark:bg-[#0d1117]"
            >
                {highlightedHtml ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                        className="[&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:p-4 [&>pre]:text-sm"
                    />
                ) : (
                    <pre className="m-0 whitespace-pre p-4 text-muted-foreground">
                        <code>{code}</code>
                    </pre>
                )}
            </div>
        </div>
    );
};
