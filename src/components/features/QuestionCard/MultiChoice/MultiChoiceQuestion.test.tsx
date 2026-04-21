import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MultiChoiceQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';
import { renderWithProviders } from '@/test/test-utils';

import { MultiChoiceQuestion as MultiChoiceQuestionComponent } from './MultiChoiceQuestion';

const makeQuestion = (overrides: Partial<MultiChoiceQuestion> = {}): MultiChoiceQuestion => ({
    id: 'mc-test-001',
    type: 'multi-choice',
    category: 'javascript',
    difficulty: 'medium',
    tags: ['test'],
    question: { en: 'Select all correct answers', ru: 'Select all correct answers' },
    options: [
        { en: 'Option A', ru: 'Option A' },
        { en: 'Option B', ru: 'Option B' },
        { en: 'Option C', ru: 'Option C' },
        { en: 'Option D', ru: 'Option D' }
    ],
    correct: [0, 2],
    explanation: {
        en: 'Options A and C are correct.',
        ru: 'Options A and C are correct.'
    },
    ...overrides
});

const defaultCallbacks = {
    onSelectionChange: vi.fn(),
    onCheckRegister: vi.fn()
};

beforeEach(() => {
    useSessionStore.setState({
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0
    });
    vi.clearAllMocks();
});

afterEach(() => {
    useSessionStore.setState({
        questionList: [],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0
    });
});

describe('MultiChoiceQuestion', () => {
    it('renders all options as checkboxes', () => {
        renderWithProviders(
            <MultiChoiceQuestionComponent question={makeQuestion()} {...defaultCallbacks} />
        );
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(4);
    });

    it('wraps options in role="group"', () => {
        renderWithProviders(
            <MultiChoiceQuestionComponent question={makeQuestion()} {...defaultCallbacks} />
        );
        expect(screen.getByRole('group', { name: 'Answer options' })).toBeInTheDocument();
    });

    it('renders option texts', () => {
        renderWithProviders(
            <MultiChoiceQuestionComponent question={makeQuestion()} {...defaultCallbacks} />
        );
        expect(screen.getByText('Option A')).toBeInTheDocument();
        expect(screen.getByText('Option B')).toBeInTheDocument();
        expect(screen.getByText('Option C')).toBeInTheDocument();
        expect(screen.getByText('Option D')).toBeInTheDocument();
    });

    it('ExplanationPanel is NOT shown before check', () => {
        renderWithProviders(
            <MultiChoiceQuestionComponent question={makeQuestion()} {...defaultCallbacks} />
        );
        expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('calls onSelectionChange(false) initially via onCheckRegister', () => {
        renderWithProviders(
            <MultiChoiceQuestionComponent question={makeQuestion()} {...defaultCallbacks} />
        );
        // onCheckRegister should be called with a function
        expect(defaultCallbacks.onCheckRegister).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls onSelectionChange(true) after clicking an option', () => {
        const onSelectionChange = vi.fn();
        renderWithProviders(
            <MultiChoiceQuestionComponent
                question={makeQuestion()}
                onSelectionChange={onSelectionChange}
                onCheckRegister={vi.fn()}
            />
        );
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        expect(onSelectionChange).toHaveBeenCalledWith(true);
    });

    it('calls onSelectionChange(false) when all options deselected', () => {
        const onSelectionChange = vi.fn();
        renderWithProviders(
            <MultiChoiceQuestionComponent
                question={makeQuestion()}
                onSelectionChange={onSelectionChange}
                onCheckRegister={vi.fn()}
            />
        );
        const firstCheckbox = screen.getAllByRole('checkbox')[0];
        fireEvent.click(firstCheckbox); // select
        fireEvent.click(firstCheckbox); // deselect
        expect(onSelectionChange).toHaveBeenLastCalledWith(false);
    });

    it('toggles selection: click once → selected, click again → deselected', () => {
        renderWithProviders(
            <MultiChoiceQuestionComponent question={makeQuestion()} {...defaultCallbacks} />
        );
        const optionA = screen.getAllByRole('checkbox')[0];
        expect(optionA).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(optionA);
        expect(optionA).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(optionA);
        expect(optionA).toHaveAttribute('aria-checked', 'false');
    });

    it('allows selecting multiple options simultaneously', () => {
        renderWithProviders(
            <MultiChoiceQuestionComponent question={makeQuestion()} {...defaultCallbacks} />
        );
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[2]);
        expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
        expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false');
        expect(checkboxes[2]).toHaveAttribute('aria-checked', 'true');
        expect(checkboxes[3]).toHaveAttribute('aria-checked', 'false');
    });

    it('calls setAnswer with selected number[] when check is triggered', () => {
        let capturedCheckFn: (() => void) | null = null;
        const onCheckRegister = vi.fn((fn: () => void) => {
            capturedCheckFn = fn;
        });
        renderWithProviders(
            <MultiChoiceQuestionComponent
                question={makeQuestion()}
                onSelectionChange={vi.fn()}
                onCheckRegister={onCheckRegister}
            />
        );

        // Select options A (0) and C (2)
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[2]);

        // Trigger check
        capturedCheckFn!();

        const storedAnswer = useSessionStore.getState().answers['mc-test-001'];
        expect(storedAnswer).toEqual([0, 2]);
    });

    it('shows ExplanationPanel after check', () => {
        let capturedCheckFn: (() => void) | null = null;
        renderWithProviders(
            <MultiChoiceQuestionComponent
                question={makeQuestion()}
                onSelectionChange={vi.fn()}
                onCheckRegister={(fn) => {
                    capturedCheckFn = fn;
                }}
            />
        );
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        act(() => {
            capturedCheckFn!();
        });
        expect(screen.getByRole('complementary')).toBeInTheDocument();
        expect(screen.getByText('Options A and C are correct.')).toBeInTheDocument();
    });

    it('highlights correct/wrong/missed options after check', () => {
        // correct: [0, 2], user selects [0, 1]
        let capturedCheckFn: (() => void) | null = null;
        renderWithProviders(
            <MultiChoiceQuestionComponent
                question={makeQuestion({ correct: [0, 2] })}
                onSelectionChange={vi.fn()}
                onCheckRegister={(fn) => {
                    capturedCheckFn = fn;
                }}
            />
        );
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]); // correct + selected
        fireEvent.click(checkboxes[1]); // incorrect + selected
        act(() => {
            capturedCheckFn!();
        });

        // Option 0: correct + selected → bg-accent/10
        expect(checkboxes[0].className).toContain('bg-accent/10');
        // Option 1: incorrect + selected → bg-error/10
        expect(checkboxes[1].className).toContain('bg-error/10');
        // Option 2: correct + missed → bg-accent/10 (isMissed)
        expect(checkboxes[2].className).toContain('bg-accent/10');
        // Option 3: incorrect + not selected → neutral
        expect(checkboxes[3].className).not.toContain('bg-accent/10');
        expect(checkboxes[3].className).not.toContain('bg-error/10');
    });

    it('locks toggles after check (no further selection changes)', () => {
        const onSelectionChange = vi.fn();
        let capturedCheckFn: (() => void) | null = null;
        renderWithProviders(
            <MultiChoiceQuestionComponent
                question={makeQuestion()}
                onSelectionChange={onSelectionChange}
                onCheckRegister={(fn) => {
                    capturedCheckFn = fn;
                }}
            />
        );
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        act(() => {
            capturedCheckFn!();
        });
        onSelectionChange.mockClear();

        // Try to toggle after check — onSelectionChange must NOT be called again
        fireEvent.click(screen.getAllByRole('checkbox')[1]);
        expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('resets state when question id changes', () => {
        const onSelectionChange = vi.fn();
        const q1 = makeQuestion({ id: 'mc-q1' });
        const q2 = makeQuestion({ id: 'mc-q2' });

        const { rerender } = renderWithProviders(
            <MultiChoiceQuestionComponent
                question={q1}
                onSelectionChange={onSelectionChange}
                onCheckRegister={vi.fn()}
            />
        );
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'true');
        onSelectionChange.mockClear();

        rerender(
            <MultiChoiceQuestionComponent
                question={q2}
                onSelectionChange={onSelectionChange}
                onCheckRegister={vi.fn()}
            />
        );

        // All options should be deselected
        screen.getAllByRole('checkbox').forEach((cb) => {
            expect(cb).toHaveAttribute('aria-checked', 'false');
        });
        // onSelectionChange(false) called on reset
        expect(onSelectionChange).toHaveBeenCalledWith(false);
    });
});
