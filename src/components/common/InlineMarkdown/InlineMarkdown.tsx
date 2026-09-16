import { Fragment, type FC } from 'react';

import { parseInlineMarkdown } from '@/lib/utils/inlineMarkdown';

interface InlineMarkdownProps {
    text: string;
    className?: string;
}

/**
 * Renders the question bank's inline markdown (`code`, **bold**, hard newlines) as React
 * nodes. Never uses dangerouslySetInnerHTML — content that is not a supported marker is
 * emitted as a text node, so HTML in the data stays visible as HTML.
 */
export const InlineMarkdown: FC<InlineMarkdownProps> = ({ text, className }) => (
    <span className={className}>
        {parseInlineMarkdown(text).map((segment, index) => {
            if (segment.type === 'break') return <br key={index} />;
            if (segment.type === 'code') {
                return (
                    <code
                        key={index}
                        className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.9em]"
                    >
                        {segment.value}
                    </code>
                );
            }
            if (segment.type === 'bold') {
                return (
                    <strong key={index} className="font-semibold">
                        {segment.value}
                    </strong>
                );
            }
            return <Fragment key={index}>{segment.value}</Fragment>;
        })}
    </span>
);
