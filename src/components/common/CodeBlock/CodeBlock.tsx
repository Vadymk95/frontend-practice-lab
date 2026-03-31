import { Check, Copy } from 'lucide-react';
import type { FC } from 'react';
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
    const { highlightedHtml, isCopied, onCopy } = useCodeBlock({ code, lang });

    return (
        <div
            className={cn(
                'relative rounded-none border border-border bg-[#0d1117] font-mono text-sm',
                className
            )}
        >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-border px-3 py-1">
                <span className="text-xs text-muted-foreground">{lang}</span>
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

            {/* Code area */}
            <div className="max-h-[320px] overflow-auto md:max-h-[480px]">
                {highlightedHtml ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                        className="[&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:p-4 [&>pre]:text-sm"
                    />
                ) : (
                    <pre className="m-0 overflow-x-auto whitespace-pre p-4 text-muted-foreground">
                        <code>{code}</code>
                    </pre>
                )}
            </div>
        </div>
    );
};
