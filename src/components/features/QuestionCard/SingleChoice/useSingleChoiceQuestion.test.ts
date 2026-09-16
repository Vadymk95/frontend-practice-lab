import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SingleChoiceQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';

import { useSingleChoiceQuestion } from './useSingleChoiceQuestion';

const makeQuestion = (id = 'q-1'): SingleChoiceQuestion => ({
    id,
    type: 'single-choice',
    category: 'javascript',
    difficulty: 'easy',
    tags: [],
    question: { en: 'What is 2+2?', ru: 'What is 2+2?' },
    explanation: { en: 'Because math.', ru: 'Because math.' },
    options: [
        { en: '2', ru: '2' },
        { en: '4', ru: '4' },
        { en: '6', ru: '6' },
        { en: '8', ru: '8' }
    ],
    correct: 1
});

beforeEach(() => {
    useSessionStore.setState({
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0
    });
});

afterEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0
    });
});

describe('useSingleChoiceQuestion', () => {
    it('isAnswered is false initially', () => {
        const q = makeQuestion();
        const { result } = renderHook(() => useSingleChoiceQuestion(q));
        expect(result.current.isAnswered).toBe(false);
        expect(result.current.selectedIndex).toBeNull();
    });

    it('onSelect maps the display index to the original index and calls setAnswer', () => {
        const q = makeQuestion();
        const { result } = renderHook(() => useSingleChoiceQuestion(q));
        const originalIndex = result.current.displayOrder[2];

        act(() => {
            result.current.onSelect(2);
        });

        expect(result.current.selectedIndex).toBe(originalIndex);
        expect(result.current.isAnswered).toBe(true);
        expect(useSessionStore.getState().answers[q.id]).toBe(originalIndex);
    });

    it('displayOrder is a permutation of every option index', () => {
        const q = makeQuestion();
        const { result } = renderHook(() => useSingleChoiceQuestion(q));

        expect([...result.current.displayOrder].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    });

    it('onSelect is locked after first selection (no re-select)', () => {
        const q = makeQuestion();
        const { result } = renderHook(() => useSingleChoiceQuestion(q));

        const firstPick = result.current.displayOrder[0];

        act(() => {
            result.current.onSelect(0);
        });

        act(() => {
            result.current.onSelect(2);
        });

        expect(result.current.selectedIndex).toBe(firstPick);
        expect(useSessionStore.getState().answers[q.id]).toBe(firstPick);
    });

    it('selectedIndex resets when question.id changes', () => {
        const q1 = makeQuestion('q-1');
        const q2 = makeQuestion('q-2');
        const { result, rerender } = renderHook(
            ({ question }: { question: SingleChoiceQuestion }) => useSingleChoiceQuestion(question),
            { initialProps: { question: q1 } }
        );

        act(() => {
            result.current.onSelect(1);
        });
        expect(result.current.selectedIndex).toBe(result.current.displayOrder[1]);

        rerender({ question: q2 });
        expect(result.current.selectedIndex).toBeNull();
        expect(result.current.isAnswered).toBe(false);
    });
});
