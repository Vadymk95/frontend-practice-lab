import type { FC } from 'react';

import { CodeBlock } from '@/components/common/CodeBlock';
import { cn } from '@/lib/utils';
import { parseMarkdownBlocks } from '@/lib/utils/markdownBlocks';

import { InlineMarkdown } from './InlineMarkdown';

interface MarkdownBlocksProps {
    text: string;
    /** Fallback highlighting language for fences that declare none. */
    lang?: string;
    className?: string;
}

/**
 * Renders prose that may contain fenced code blocks: the prose keeps its inline markdown,
 * each fence becomes a CodeBlock. Used for reference answers, which are written as prose.
 */
export const MarkdownBlocks: FC<MarkdownBlocksProps> = ({
    text,
    lang = 'javascript',
    className
}) => (
    <div className={cn('flex flex-col gap-3', className)}>
        {parseMarkdownBlocks(text).map((block, index) =>
            block.type === 'code' ? (
                <CodeBlock key={index} code={block.value} lang={block.lang ?? lang} />
            ) : (
                <p key={index} className="text-sm">
                    <InlineMarkdown text={block.value} />
                </p>
            )
        )}
    </div>
);
