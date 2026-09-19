import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BugFindingQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';
import { renderWithProviders } from '@/test/test-utils';

import { BugFindingQuestion as BugFindingQuestionComponent } from './BugFindingQuestion';

vi.mock('@/lib/shiki', () => ({
    getHighlighter: vi.fn().mockResolvedValue({
        codeToHtml: (code: string) =>
            `<pre class="shiki"><code>${code.replace(/</g, '&lt;')}</code></pre>`
    })
}));

const makeBugFindingQuestion = (
    overrides: Partial<BugFindingQuestion> = {}
): BugFindingQuestion => ({
    id: 'bf-test-001',
    type: 'bug-finding',
    category: 'javascript',
    difficulty: 'medium',
    tags: ['test'],
    question: { en: 'Find the bug in this code', ru: 'Find the bug in this code' },
    code: 'for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }',
    options: [
        { en: 'var should be let', ru: 'var should be let' },
        { en: 'setTimeout delay is wrong', ru: 'setTimeout delay is wrong' },
        { en: 'Arrow function is wrong', ru: 'Arrow function is wrong' }
    ],
    correct: 0,
    referenceAnswer: 'for (let i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }',
    explanation: {
        en: 'var is function-scoped; use let for block-scoped binding.',
        ru: 'var is function-scoped; use let for block-scoped binding.'
    },
    ...overrides
});

const defaultCallbacks = {
    onSubmitRegister: vi.fn(),
    onSelfAssessRegister: vi.fn()
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

describe('BugFindingQuestion', () => {
    it('renders CodeBlock with buggy code', async () => {
        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                {...defaultCallbacks}
            />
        );
        await waitFor(() => {
            expect(document.querySelector('.shiki')).toBeInTheDocument();
        });
    });

    it('renders AnswerOption list when options present', () => {
        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                {...defaultCallbacks}
            />
        );
        expect(screen.getAllByRole('radio')).toHaveLength(3);
        expect(screen.getByRole('group', { name: 'Answer options' })).toBeInTheDocument();
    });

    it('renders text Input when options absent', () => {
        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion({ options: undefined })}
                {...defaultCallbacks}
            />
        );
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('does not render a Submit button inside the component', () => {
        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                {...defaultCallbacks}
            />
        );
        expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    });

    it('onSubmitRegister receives a function', () => {
        const onSubmitRegister = vi.fn();
        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );
        expect(onSubmitRegister).toHaveBeenCalledWith(expect.any(Function));
    });

    it('onSelfAssessRegister receives a function', () => {
        const onSelfAssessRegister = vi.fn();
        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={vi.fn()}
                onSelfAssessRegister={onSelfAssessRegister}
            />
        );
        expect(onSelfAssessRegister).toHaveBeenCalledWith(expect.any(Function));
    });

    it('triggering submit shows reference solution and ExplanationPanel', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);

        await act(async () => {
            capturedSubmitFn!();
        });

        await waitFor(() => {
            expect(screen.getByText('Reference solution')).toBeInTheDocument();
        });
        expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('self-assessment buttons appear after submit, disappear after tap', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);
        await act(async () => {
            capturedSubmitFn!();
        });

        expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Missed it' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Got it' }));

        expect(screen.queryByRole('button', { name: 'Got it' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Missed it' })).not.toBeInTheDocument();
    });

    it('"Got it" stores "gotIt" in sessionStore', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);
        await act(async () => {
            capturedSubmitFn!();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Got it' }));

        expect(useSessionStore.getState().answers['bf-test-001']).toBe('gotIt');
    });

    it('"Missed it" stores "missedIt" in sessionStore', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);
        await act(async () => {
            capturedSubmitFn!();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Missed it' }));

        expect(useSessionStore.getState().answers['bf-test-001']).toBe('missedIt');
    });

    it('onSelfAssessRegister callback triggers self-assessment', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        let capturedSelfAssessFn: ((r: 'gotIt' | 'missedIt') => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });
        const onSelfAssessRegister = vi.fn((fn: (r: 'gotIt' | 'missedIt') => void) => {
            capturedSelfAssessFn = fn;
        });

        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={onSelfAssessRegister}
            />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);
        await act(async () => {
            capturedSubmitFn!();
        });
        act(() => {
            capturedSelfAssessFn!('gotIt');
        });

        expect(useSessionStore.getState().answers['bf-test-001']).toBe('gotIt');
    });

    it('text input answer stores trimmed text on submit', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion({ options: undefined })}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: '  loose equality  ' }
        });
        await act(async () => {
            capturedSubmitFn!();
        });

        expect(useSessionStore.getState().answers['bf-test-001']).toBe('loose equality');
    });

    it('resets state when question id changes', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        const q1 = makeBugFindingQuestion({ id: 'bf-q1' });
        const q2 = makeBugFindingQuestion({ id: 'bf-q2' });

        const { rerender } = renderWithProviders(
            <BugFindingQuestionComponent
                question={q1}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);
        await act(async () => {
            capturedSubmitFn!();
        });

        await waitFor(() => {
            expect(screen.getByText('Reference solution')).toBeInTheDocument();
        });

        rerender(
            <BugFindingQuestionComponent
                question={q2}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        expect(screen.queryByText('Reference solution')).not.toBeInTheDocument();
        screen
            .getAllByRole('radio')
            .forEach((r) => expect(r).toHaveAttribute('aria-checked', 'false'));
    });

    it('options are locked after submit (cannot change selection)', async () => {
        let capturedSubmitFn: (() => void) | null = null;
        const onSubmitRegister = vi.fn((fn: () => void) => {
            capturedSubmitFn = fn;
        });

        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion()}
                onSubmitRegister={onSubmitRegister}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);
        await act(async () => {
            capturedSubmitFn!();
        });

        fireEvent.click(screen.getAllByRole('radio')[1]);
        expect(screen.getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'false');
    });
});

describe('BugFindingQuestion — reference answer and snippet language', () => {
    const textOnlyQuestion = (overrides: Partial<BugFindingQuestion> = {}) =>
        makeBugFindingQuestion({ options: undefined, correct: 'stale closure', ...overrides });

    it('highlights the snippet with the question language, not a hardcoded one', () => {
        renderWithProviders(
            <BugFindingQuestionComponent
                question={makeBugFindingQuestion({ lang: 'typescript' })}
                {...defaultCallbacks}
            />
        );
        expect(screen.getByText('typescript')).toBeInTheDocument();
        expect(screen.queryByText('javascript')).not.toBeInTheDocument();
    });

    it('renders reference-answer prose as text and only the fence as code', async () => {
        let submitFn: (() => void) | null = null;
        const { container } = renderWithProviders(
            <BugFindingQuestionComponent
                question={textOnlyQuestion({
                    referenceAnswer: 'Add the directive:\n```ts\nexport async function a() {}\n```'
                })}
                onSubmitRegister={(fn) => {
                    submitFn = fn;
                }}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
            target: { value: 'missing directive' }
        });
        await waitFor(() => expect(submitFn).not.toBeNull());
        act(() => submitFn?.());

        expect(container.textContent).toContain('Add the directive:');
        expect(screen.getByText('ts')).toBeInTheDocument();
        // The prose must not be swallowed into the code block.
        expect(container.querySelector('.shiki')?.textContent).not.toContain('Add the directive');
    });

    it('renders backticks inside reference-answer prose as code', async () => {
        let submitFn: (() => void) | null = null;
        const { container } = renderWithProviders(
            <BugFindingQuestionComponent
                question={textOnlyQuestion({ referenceAnswer: 'Use `useCallback` instead.' })}
                onSubmitRegister={(fn) => {
                    submitFn = fn;
                }}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
            target: { value: 'stale closure' }
        });
        await waitFor(() => expect(submitFn).not.toBeNull());
        act(() => submitFn?.());

        expect(container.textContent).toContain('Use');
        const codeSpans = [...container.querySelectorAll('code')].map((el) => el.textContent);
        expect(codeSpans).toContain('useCallback');
        // Only the question snippet is highlighted — the prose is not a code block.
        expect(container.querySelectorAll('.shiki')).toHaveLength(1);
    });
});

describe('BugFindingQuestion — free-text field and submit gating', () => {
    const textOnly = (overrides: Partial<BugFindingQuestion> = {}) =>
        makeBugFindingQuestion({ options: undefined, correct: 'stale closure', ...overrides });

    it('asks for prose in a multi-line field, not a one-line input', () => {
        renderWithProviders(
            <BugFindingQuestionComponent question={textOnly()} {...defaultCallbacks} />
        );
        const field = screen.getByRole('textbox', { name: 'Your answer' });
        expect(field.tagName).toBe('TEXTAREA');
        expect(field).toHaveAttribute('rows', '3');
        expect(field.className).toContain('field-sizing-content');
    });

    it('reports canSubmit=false on mount so a remount cannot leave Submit live', () => {
        const onCanSubmitChange = vi.fn();
        renderWithProviders(
            <BugFindingQuestionComponent
                question={textOnly()}
                {...defaultCallbacks}
                onCanSubmitChange={onCanSubmitChange}
            />
        );
        expect(onCanSubmitChange).toHaveBeenCalledWith(false);
    });

    it('reports canSubmit=false again when the question changes', () => {
        const onCanSubmitChange = vi.fn();
        const { rerender } = renderWithProviders(
            <BugFindingQuestionComponent
                question={textOnly({ id: 'bf-a' })}
                {...defaultCallbacks}
                onCanSubmitChange={onCanSubmitChange}
            />
        );
        fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
            target: { value: 'something' }
        });
        expect(onCanSubmitChange).toHaveBeenLastCalledWith(true);

        rerender(
            <BugFindingQuestionComponent
                question={textOnly({ id: 'bf-b' })}
                {...defaultCallbacks}
                onCanSubmitChange={onCanSubmitChange}
            />
        );

        expect(onCanSubmitChange).toHaveBeenLastCalledWith(false);
    });

    it('still enables submit once the user types', () => {
        const onCanSubmitChange = vi.fn();
        renderWithProviders(
            <BugFindingQuestionComponent
                question={textOnly()}
                {...defaultCallbacks}
                onCanSubmitChange={onCanSubmitChange}
            />
        );
        fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
            target: { value: 'the callback captures a stale value' }
        });
        expect(onCanSubmitChange).toHaveBeenLastCalledWith(true);
    });
});

describe('BugFindingQuestion — localized reference answer', () => {
    const textOnlyQuestion = (overrides: Partial<BugFindingQuestion> = {}) =>
        makeBugFindingQuestion({ options: undefined, correct: 'stale closure', ...overrides });

    it('resolves the { en, ru } form for the active language', async () => {
        let submitFn: (() => void) | null = null;
        const { container } = renderWithProviders(
            <BugFindingQuestionComponent
                question={textOnlyQuestion({
                    referenceAnswer: {
                        en: 'Bound the queue before flushing it.',
                        ru: 'Ограничьте очередь перед сбросом.'
                    }
                })}
                onSubmitRegister={(fn) => {
                    submitFn = fn;
                }}
                onSelfAssessRegister={vi.fn()}
            />
        );

        fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
            target: { value: 'unbounded queue' }
        });
        await waitFor(() => expect(submitFn).not.toBeNull());
        act(() => submitFn?.());

        expect(container.textContent).toContain('Bound the queue before flushing it.');
        expect(container.textContent).not.toContain('[object Object]');
    });
});
