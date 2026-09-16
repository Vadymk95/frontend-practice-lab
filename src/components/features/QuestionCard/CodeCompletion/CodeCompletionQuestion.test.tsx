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
    question: { en: 'Complete the function:', ru: 'Complete the function:' },
    code: 'function add(a, b) {\n  return __BLANK__ + __BLANK__;\n}',
    blanks: ['a', 'b'],
    referenceAnswer: 'function add(a, b) {\n  return a + b;\n}',
    explanation: { en: 'Add the two parameters.', ru: 'Add the two parameters.' },
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

describe('CodeCompletionQuestion — tolerant grading', () => {
    const submitWith = async (
        question: CodeCompletionQuestionData,
        values: string[]
    ): Promise<void> => {
        let capturedSubmitFn: (() => void) | null = null;
        renderWithProviders(
            <CodeCompletionQuestion
                question={question}
                onSubmitRegister={(fn) => {
                    capturedSubmitFn = fn;
                }}
                onAllBlanksFilled={vi.fn()}
            />
        );
        const inputs = screen.getAllByRole('textbox');
        values.forEach((value, i) => fireEvent.change(inputs[i]!, { target: { value } }));
        await act(async () => {
            capturedSubmitFn!();
        });
    };

    it('accepts a smart quote where the bank has a straight one', async () => {
        const question = makeCodeCompletionQuestion({
            code: 'const role = __BLANK__;',
            blanks: ["'assistant'"]
        });
        await submitWith(question, ['\u2019assistant\u2019']);

        expect(screen.getAllByRole('textbox')[0]!.className).toContain('border-accent');
        expect(useSessionStore.getState().answers[question.id]).toBe('correct');
    });

    it('accepts a multi-token blank whose spacing differs', async () => {
        const question = makeCodeCompletionQuestion({
            code: 'useCallback(fn, __BLANK__);',
            blanks: ['[onSearch, query]']
        });
        await submitWith(question, ['[onSearch,   query]']);

        expect(useSessionStore.getState().answers[question.id]).toBe('correct');
    });

    it('accepts a trailing semicolon the bank omits', async () => {
        const question = makeCodeCompletionQuestion({
            code: 'const a = __BLANK__;',
            blanks: ['1']
        });
        await submitWith(question, ['1;']);

        expect(useSessionStore.getState().answers[question.id]).toBe('correct');
    });

    it('still rejects a genuinely wrong answer', async () => {
        const question = makeCodeCompletionQuestion({
            code: 'const role = __BLANK__;',
            blanks: ["'assistant'"]
        });
        await submitWith(question, ["'user'"]);

        expect(useSessionStore.getState().answers[question.id]).toBe('incorrect');
    });
});

describe('CodeCompletionQuestion — keyboard and mobile affordances', () => {
    const renderQuestion = (question = makeCodeCompletionQuestion()) =>
        renderWithProviders(
            <CodeCompletionQuestion
                question={question}
                onSubmitRegister={vi.fn()}
                onAllBlanksFilled={vi.fn()}
            />
        );

    it('submits on Enter once every blank is filled', async () => {
        const question = makeCodeCompletionQuestion();
        renderQuestion(question);
        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0]!, { target: { value: 'a' } });
        fireEvent.change(inputs[1]!, { target: { value: 'b' } });

        await act(async () => {
            fireEvent.keyDown(inputs[1]!, { key: 'Enter' });
        });

        expect(useSessionStore.getState().answers[question.id]).toBe('correct');
    });

    it('does nothing on Enter while a blank is still empty', async () => {
        const question = makeCodeCompletionQuestion();
        renderQuestion(question);
        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0]!, { target: { value: 'a' } });

        await act(async () => {
            fireEvent.keyDown(inputs[0]!, { key: 'Enter' });
        });

        expect(useSessionStore.getState().answers[question.id]).toBeUndefined();
        expect(inputs[0]).not.toBeDisabled();
    });

    it('turns off the phone keyboard corrections that break exact answers', () => {
        renderQuestion();
        const input = screen.getAllByRole('textbox')[0]!;
        expect(input).toHaveAttribute('autocapitalize', 'off');
        expect(input).toHaveAttribute('autocorrect', 'off');
        expect(input).toHaveAttribute('spellcheck', 'false');
    });

    it('gives the blank a tappable target and a readable size', () => {
        renderQuestion();
        const input = screen.getAllByRole('textbox')[0]!;
        expect(input.className).toContain('min-h-11');
        expect(input.className).toContain('text-base');
        expect(input.className).toContain('font-mono');
    });

    it('wraps the snippet instead of clipping blanks off-screen', () => {
        const { container } = renderQuestion();
        const pre = container.querySelector('pre');
        expect(pre?.className).toContain('whitespace-pre-wrap');
        expect(pre?.className).not.toContain('whitespace-pre ');
    });

    it('uses theme tokens so the typed answer is readable in light theme', () => {
        const { container } = renderQuestion();
        const pre = container.querySelector('pre');
        expect(pre?.className).toContain('bg-white');
        expect(pre?.className).toContain('dark:bg-[#0d1117]');
        const shell = container.querySelector('div.border-border');
        expect(shell?.className).toContain('bg-white');
        expect(shell?.className).toContain('dark:bg-[#0d1117]');
    });
});
