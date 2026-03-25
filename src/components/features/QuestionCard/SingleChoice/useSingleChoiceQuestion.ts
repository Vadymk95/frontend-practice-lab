import { useCallback, useEffect, useState } from 'react';

import type { SingleChoiceQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

export function useSingleChoiceQuestion(question: SingleChoiceQuestion) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const setAnswer = useSessionStore.use.setAnswer();
    const isAnswered = selectedIndex !== null;

    const onSelect = useCallback(
        (index: number) => {
            if (isAnswered) return;
            setSelectedIndex(index);
            setAnswer(question.id, index);
        },
        [isAnswered, question.id, setAnswer]
    );

    // Reset when question changes (navigation forward)
    useEffect(() => {
        setSelectedIndex(null);
    }, [question.id]);

    // Keyboard: 1–4 keys select option
    useEffect(() => {
        if (isAnswered) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            const index = parseInt(e.key) - 1;
            if (index >= 0 && index < question.options.length) {
                onSelect(index);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isAnswered, question.options.length, onSelect]);

    return { selectedIndex, isAnswered, onSelect };
}
