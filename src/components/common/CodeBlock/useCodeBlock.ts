import { useCallback, useEffect, useRef, useState } from 'react';

import { getHighlighter } from '@/lib/shiki';

interface UseCodeBlockProps {
    code: string;
    lang?: string;
}

interface UseCodeBlockReturn {
    highlightedHtml: string | null;
    isCopied: boolean;
    onCopy: () => void;
}

export function useCodeBlock({ code, lang = 'javascript' }: UseCodeBlockProps): UseCodeBlockReturn {
    const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
        setHighlightedHtml(null);
        getHighlighter()
            .then((h) => {
                if (!cancelled) {
                    try {
                        setHighlightedHtml(h.codeToHtml(code, { lang, theme: 'github-dark' }));
                    } catch {
                        // unsupported language or invalid code — keep fallback
                    }
                }
            })
            .catch(() => {
                // highlighter failed to initialize — keep fallback
            });
        return () => {
            cancelled = true;
        };
    }, [code, lang]);

    useEffect(
        () => () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        },
        []
    );

    const onCopy = useCallback(() => {
        navigator.clipboard
            .writeText(code)
            .then(() => {
                setIsCopied(true);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
            })
            .catch(() => {
                // clipboard unavailable or permission denied — no feedback
            });
    }, [code]);

    return { highlightedHtml, isCopied, onCopy };
}
