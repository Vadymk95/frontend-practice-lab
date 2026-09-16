import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SingleChoiceQuestion as SingleChoiceQuestionData } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';
import { renderWithProviders } from '@/test/test-utils';

import { SingleChoiceQuestion } from './SingleChoiceQuestion';

const forcedOrder = vi.hoisted(() => ({ value: null as number[] | null }));

vi.mock('@/lib/utils/optionOrder', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/utils/optionOrder')>();
    return {
        createOptionOrder: (length: number) => forcedOrder.value ?? actual.createOptionOrder(length)
    };
});

const makeQuestion = (): SingleChoiceQuestionData => ({
    id: 'sc-shuffle-1',
    type: 'single-choice',
    category: 'javascript',
    difficulty: 'easy',
    tags: [],
    question: { en: 'Pick one', ru: 'Pick one' },
    explanation: { en: 'Because.', ru: 'Because.' },
    options: [
        { en: 'alpha', ru: 'alpha' },
        { en: 'beta', ru: 'beta' },
        { en: 'gamma', ru: 'gamma' },
        { en: 'delta', ru: 'delta' }
    ],
    correct: 2
});

const resetStore = () =>
    useSessionStore.setState({
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0
    });

/** Letter label -> option text, read from the rendered radios in DOM order. */
const renderedOrder = () =>
    screen.getAllByRole('radio').map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '');

beforeEach(() => {
    forcedOrder.value = null;
    resetStore();
});

afterEach(() => {
    vi.restoreAllMocks();
    resetStore();
});

describe('SingleChoiceQuestion — option shuffling', () => {
    it('renders options in the drawn display order, not in bank order', () => {
        forcedOrder.value = [3, 2, 1, 0];
        renderWithProviders(<SingleChoiceQuestion question={makeQuestion()} />);
        expect(renderedOrder()).toEqual(['Adelta', 'Bgamma', 'Cbeta', 'Dalpha']);
    });

    it('stores the ORIGINAL option index when the first displayed option is picked', async () => {
        forcedOrder.value = [3, 2, 1, 0];
        const question = makeQuestion();
        renderWithProviders(<SingleChoiceQuestion question={question} />);

        fireEvent.click(screen.getAllByRole('radio')[0]!);

        await waitFor(() => {
            expect(useSessionStore.getState().answers[question.id]).toBe(3);
        });
    });

    it('maps a keyboard display index through the drawn order', async () => {
        forcedOrder.value = [3, 2, 1, 0];
        const question = makeQuestion();
        const registered: { selectFn: ((idx: number) => void) | null } = { selectFn: null };
        renderWithProviders(
            <SingleChoiceQuestion
                question={question}
                onSelectOptionRegister={(fn) => {
                    registered.selectFn = fn;
                }}
            />
        );

        await waitFor(() => expect(registered.selectFn).not.toBeNull());
        // Display position 1 shows "gamma", which is bank index 2.
        act(() => registered.selectFn?.(1));

        await waitFor(() => {
            expect(useSessionStore.getState().answers[question.id]).toBe(2);
        });
    });

    it('highlights the correct option by its ORIGINAL index after a wrong pick', async () => {
        forcedOrder.value = [3, 2, 1, 0];
        renderWithProviders(<SingleChoiceQuestion question={makeQuestion()} />);

        fireEvent.click(screen.getAllByRole('radio')[0]!);

        await waitFor(() => {
            const options = screen.getAllByRole('radio');
            // "gamma" is the correct answer (bank index 2) and is displayed second.
            expect(options[1]!.textContent).toContain('gamma');
            expect(options[1]!.className).toContain('border-accent');
            expect(options[0]!.className).toContain('border-error');
        });
    });

    it('keeps the drawn display order stable across re-renders of the same mount', () => {
        const draws = [0, 0, 0, 0.99, 0.99, 0.99];
        let call = 0;
        vi.spyOn(Math, 'random').mockImplementation(() => draws[call++] ?? 0);

        const question = makeQuestion();
        const { rerender } = renderWithProviders(<SingleChoiceQuestion question={question} />);
        const first = renderedOrder();
        expect(first).not.toEqual(['Aalpha', 'Bbeta', 'Cgamma', 'Ddelta']);

        rerender(<SingleChoiceQuestion question={question} />);

        expect(renderedOrder()).toEqual(first);
    });
});
