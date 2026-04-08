import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CodeCompletionQuestion as CodeCompletionQuestionData } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';
import { renderWithProviders } from '@/test/test-utils';

import { CodeCompletionQuestion } from './CodeCompletionQuestion';

vi.mock('@/lib/shiki', () => ({
    getHighlighter: vi.fn().mockResolvedValue({
        codeToHtml: (code: string) =>
            `<pre class="shiki"><code>${code.replace(/</g, '&lt;')}</code></pre>`
    })
}));

const makeCodeCompletionQuestion = (
    overrides: Partial<CodeCompletionQuestionData> = {}
): CodeCompletionQuestionData => ({
    id: 'cc-test-001',
    type: 'code-completion',
    category: 'javascript',
    difficulty: 'medium',
    tags: ['test'],
    question: 'Complete the function:',
    code: 'function add(a, b) {\n  return __BLANK__ + __BLANK__;\n}',
    blanks: ['a', 'b'],
    referenceAnswer: 'function add(a, b) {\n  return a + b;\n}',
    explanation: 'Add the two parameters.',
    ...overrides
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

describe('CodeCompletionQuestion', () => {
    it('renders inputs equal to blanks count', () => {
        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={vi.fn()}
                onAllBlanksFilled={vi.fn()}
            />
        );
        expect(screen.getAllByRole('textbox')).toHaveLength(2);
    });

    it('inputs have correct aria-label', () => {
        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={vi.fn()}
                onAllBlanksFilled={vi.fn()}
            />
        );
        expect(screen.getByRole('textbox', { name: 'Blank 1' })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Blank 2' })).toBeInTheDocument();
    });

    it('onSubmitRegister receives a function', () => {
        const onSubmitRegister = vi.fn();
        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );
        expect(onSubmitRegister).toHaveBeenCalledWith(expect.any(Function));
    });

    it('onAllBlanksFilled called with false initially', () => {
        const onAllBlanksFilled = vi.fn();
        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={vi.fn()}
                onAllBlanksFilled={onAllBlanksFilled}
            />
        );
        expect(onAllBlanksFilled).toHaveBeenCalledWith(false);
    });

    it('onAllBlanksFilled called with true when all blanks filled', () => {
        const onAllBlanksFilled = vi.fn();
        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={vi.fn()}
                onAllBlanksFilled={onAllBlanksFilled}
            />
        );
        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'a' } });
        // still false — only one filled
        expect(onAllBlanksFilled).not.toHaveBeenLastCalledWith(true);
        fireEvent.change(inputs[1], { target: { value: 'b' } });
        // now true
        expect(onAllBlanksFilled).toHaveBeenLastCalledWith(true);
    });

    it("stores 'correct' when all blanks match (case-insensitive + trim)", async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: '  A  ' } });
        fireEvent.change(inputs[1], { target: { value: 'B  ' } });

        await act(async () => {
            capturedSubmitFn!();
        });

        expect(useSessionStore.getState().answers['cc-test-001']).toBe('correct');
    });

    it("stores 'incorrect' when any blank is wrong", async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'wrong' } });
        fireEvent.change(inputs[1], { target: { value: 'b' } });

        await act(async () => {
            capturedSubmitFn!();
        });

        expect(useSessionStore.getState().answers['cc-test-001']).toBe('incorrect');
    });

    it('correct blank gets accent styling after submit', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'a' } });
        fireEvent.change(inputs[1], { target: { value: 'b' } });

        await act(async () => {
            capturedSubmitFn!();
        });

        const updatedInputs = screen.getAllByRole('textbox');
        expect(updatedInputs[0].className).toContain('border-accent');
    });

    it('incorrect blank gets error styling after submit', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'wrong' } });
        fireEvent.change(inputs[1], { target: { value: 'b' } });

        await act(async () => {
            capturedSubmitFn!();
        });

        const updatedInputs = screen.getAllByRole('textbox');
        expect(updatedInputs[0].className).toContain('border-error');
    });

    it('inputs disabled after submit', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'a' } });
        fireEvent.change(inputs[1], { target: { value: 'b' } });

        await act(async () => {
            capturedSubmitFn!();
        });

        screen.getAllByRole('textbox').forEach((input) => {
            expect(input).toBeDisabled();
        });
    });

    it('ExplanationPanel and reference solution appear after submit', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <CodeCompletionQuestion
                question={makeCodeCompletionQuestion()}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'a' } });
        fireEvent.change(inputs[1], { target: { value: 'b' } });

        await act(async () => {
            capturedSubmitFn!();
        });

        await waitFor(() => {
            expect(screen.getByRole('complementary')).toBeInTheDocument();
            expect(screen.getByText('Reference solution')).toBeInTheDocument();
        });
    });

    it('resets state when question id changes', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        const q1 = makeCodeCompletionQuestion({ id: 'cc-1' });
        const q2 = makeCodeCompletionQuestion({ id: 'cc-2' });

        const { rerender } = renderWithProviders(
            <CodeCompletionQuestion
                question={q1}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: 'a' } });
        fireEvent.change(inputs[1], { target: { value: 'b' } });

        await act(async () => {
            capturedSubmitFn!();
        });

        rerender(
            <CodeCompletionQuestion
                question={q2}
                onSubmitRegister={onSubmitRegister}
                onAllBlanksFilled={vi.fn()}
            />
        );

        screen.getAllByRole('textbox').forEach((input) => {
            expect(input).toHaveValue('');
        });
        expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });
});
