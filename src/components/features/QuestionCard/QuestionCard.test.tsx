import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MultiChoiceQuestion, SingleChoiceQuestion } from '@/lib/data/schema';
import { useSessionStore } from '@/store/session';
import { renderWithProviders } from '@/test/test-utils';

import { QuestionCard } from './QuestionCard';

const mockQuestion: SingleChoiceQuestion = {
    id: 'q-test-1',
    type: 'single-choice',
    category: 'JavaScript',
    difficulty: 'medium',
    tags: [],
    question: 'What does typeof null return?',
    explanation: 'null is a primitive but typeof returns object.',
    options: ['null', 'undefined', 'object', 'number'],
    correct: 2
};

beforeEach(() => {
    useSessionStore.setState({
        questionList: [mockQuestion],
        currentIndex: 0,
        answers: {},
        skipList: [],
        config: null,
        timerMs: 0
    });
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

describe('QuestionCard', () => {
    it('renders null when no current question', () => {
        useSessionStore.setState({ questionList: [], currentIndex: 0 });
        const { container } = renderWithProviders(<QuestionCard />);
        expect(container.firstChild).toBeNull();
    });

    it('displays progress indicator "1 / 1"', () => {
        renderWithProviders(<QuestionCard />);
        expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });

    it('displays progress with multiple questions "1 / 5"', () => {
        const questions = Array.from({ length: 5 }, (_, i) => ({
            ...mockQuestion,
            id: `q-${i}`
        }));
        useSessionStore.setState({ questionList: questions, currentIndex: 0 });
        renderWithProviders(<QuestionCard />);
        expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    it('shows category badge', () => {
        renderWithProviders(<QuestionCard />);
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('shows difficulty badge', () => {
        renderWithProviders(<QuestionCard />);
        expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('renders question text as h2', () => {
        renderWithProviders(<QuestionCard />);
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent('What does typeof null return?');
    });

    it('renders SingleChoiceQuestion when type is single-choice', () => {
        renderWithProviders(<QuestionCard />);
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
        expect(screen.getByText('null')).toBeInTheDocument();
        expect(screen.getByText('object')).toBeInTheDocument();
    });

    describe('Back button', () => {
        it('does not show Back button when question is unanswered', () => {
            renderWithProviders(<QuestionCard />);
            expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
        });

        it('shows Back button when question is answered', () => {
            useSessionStore.setState({
                questionList: [mockQuestion],
                currentIndex: 0,
                answers: { [mockQuestion.id]: 2 },
                skipList: [],
                config: null,
                timerMs: 0
            });
            renderWithProviders(<QuestionCard />);
            expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        });

        it('removes answer from store when Back is tapped', async () => {
            useSessionStore.setState({
                questionList: [mockQuestion],
                currentIndex: 0,
                answers: { [mockQuestion.id]: 2 },
                skipList: [],
                config: null,
                timerMs: 0
            });
            renderWithProviders(<QuestionCard />);
            fireEvent.click(screen.getByRole('button', { name: /back/i }));
            await waitFor(() => {
                expect(useSessionStore.getState().answers[mockQuestion.id]).toBeUndefined();
            });
        });

        it('hides Back button after tapping it (answer removed)', async () => {
            useSessionStore.setState({
                questionList: [mockQuestion],
                currentIndex: 0,
                answers: { [mockQuestion.id]: 2 },
                skipList: [],
                config: null,
                timerMs: 0
            });
            renderWithProviders(<QuestionCard />);
            fireEvent.click(screen.getByRole('button', { name: /back/i }));
            await waitFor(() => {
                expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
            });
        });
    });

    describe('Skip button', () => {
        it('shows Skip button when question is unanswered', () => {
            renderWithProviders(<QuestionCard />);
            expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
        });

        it('hides Skip button when question is answered', () => {
            useSessionStore.setState({
                questionList: [mockQuestion],
                currentIndex: 0,
                answers: { [mockQuestion.id]: 2 },
                skipList: [],
                config: null,
                timerMs: 0
            });
            renderWithProviders(<QuestionCard />);
            expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
        });

        it('adds question to skipList and answers when Skip tapped', async () => {
            useSessionStore.setState({
                questionList: [mockQuestion],
                currentIndex: 0,
                answers: {},
                skipList: [],
                config: null,
                timerMs: 0
            });
            renderWithProviders(<QuestionCard />);
            fireEvent.click(screen.getByRole('button', { name: /skip/i }));
            await waitFor(() => {
                expect(useSessionStore.getState().skipList).toContain(mockQuestion.id);
                expect(useSessionStore.getState().answers[mockQuestion.id]).toBe('skipped');
            });
        });

        it('hides Skip button and does not show Back after skip', async () => {
            renderWithProviders(<QuestionCard />);
            fireEvent.click(screen.getByRole('button', { name: /skip/i }));
            await waitFor(() => {
                expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
                expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
            });
        });
    });

    it('renders MultiChoiceQuestion when type is multi-choice', () => {
        const multiQuestion: MultiChoiceQuestion = {
            id: 'mc-q-1',
            type: 'multi-choice',
            category: 'JavaScript',
            difficulty: 'medium',
            tags: [],
            question: 'Which are truthy?',
            explanation: 'Empty array and non-zero numbers are truthy.',
            options: ['0', '[]', '""', '1'],
            correct: [1, 3]
        };
        useSessionStore.setState({
            questionList: [multiQuestion],
            currentIndex: 0,
            answers: {},
            skipList: [],
            config: null,
            timerMs: 0
        });
        renderWithProviders(<QuestionCard onSelectionChange={vi.fn()} onCheckRegister={vi.fn()} />);
        expect(screen.getByRole('group', { name: 'Answer options' })).toBeInTheDocument();
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(4);
    });
});
