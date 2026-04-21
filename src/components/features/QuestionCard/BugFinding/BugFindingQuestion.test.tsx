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
