import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SingleChoiceQuestion } from '@/lib/data/schema';
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
});
