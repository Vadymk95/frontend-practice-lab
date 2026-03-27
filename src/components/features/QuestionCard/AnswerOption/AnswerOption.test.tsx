import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnswerOption } from './AnswerOption';

const defaultProps = {
    index: 0,
    text: 'Option A text',
    isSelected: false,
    isAnswered: false,
    isCorrect: false,
    isDisabled: false,
    onSelect: vi.fn()
};

describe('AnswerOption — radio variant (default)', () => {
    it('renders with role="radio" by default', () => {
        render(<AnswerOption {...defaultProps} />);
        expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('renders option letter label A for index 0', () => {
        render(<AnswerOption {...defaultProps} index={0} />);
        expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('renders option letter label C for index 2', () => {
        render(<AnswerOption {...defaultProps} index={2} />);
        expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('renders option text', () => {
        render(<AnswerOption {...defaultProps} />);
        expect(screen.getByText('Option A text')).toBeInTheDocument();
    });

    it('calls onSelect when clicked', () => {
        const onSelect = vi.fn();
        render(<AnswerOption {...defaultProps} onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('radio'));
        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('shows checkmark icon when correct and answered', () => {
        render(
            <AnswerOption {...defaultProps} isSelected={true} isAnswered={true} isCorrect={true} />
        );
        expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('shows cross icon when selected but wrong and answered', () => {
        render(
            <AnswerOption {...defaultProps} isSelected={true} isAnswered={true} isCorrect={false} />
        );
        expect(screen.getByText('✗')).toBeInTheDocument();
    });

    it('does not show icon when not answered', () => {
        render(<AnswerOption {...defaultProps} isSelected={true} isAnswered={false} />);
        expect(screen.queryByText('✓')).not.toBeInTheDocument();
        expect(screen.queryByText('✗')).not.toBeInTheDocument();
    });
});

describe('AnswerOption — checkbox variant', () => {
    it('renders with role="checkbox" when variant is checkbox', () => {
        render(<AnswerOption {...defaultProps} variant="checkbox" />);
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('does NOT render role="radio" when variant is checkbox', () => {
        render(<AnswerOption {...defaultProps} variant="checkbox" />);
        expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('renders with role="radio" when variant is explicitly radio', () => {
        render(<AnswerOption {...defaultProps} variant="radio" />);
        expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('shows checkmark icon for correct selected option after check', () => {
        render(
            <AnswerOption
                {...defaultProps}
                variant="checkbox"
                isSelected={true}
                isAnswered={true}
                isCorrect={true}
            />
        );
        expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('shows cross icon for incorrect selected option after check', () => {
        render(
            <AnswerOption
                {...defaultProps}
                variant="checkbox"
                isSelected={true}
                isAnswered={true}
                isCorrect={false}
            />
        );
        expect(screen.getByText('✗')).toBeInTheDocument();
    });

    it('shows no icon for isMissed option (correct but not selected)', () => {
        render(
            <AnswerOption
                {...defaultProps}
                variant="checkbox"
                isSelected={false}
                isAnswered={true}
                isCorrect={true}
                isMissed={true}
            />
        );
        expect(screen.queryByText('✓')).not.toBeInTheDocument();
        expect(screen.queryByText('✗')).not.toBeInTheDocument();
    });

    it('isMissed option has accent highlight class', () => {
        render(
            <AnswerOption
                {...defaultProps}
                variant="checkbox"
                isSelected={false}
                isAnswered={true}
                isCorrect={true}
                isMissed={true}
            />
        );
        const btn = screen.getByRole('checkbox');
        expect(btn.className).toContain('bg-accent/10');
        expect(btn.className).toContain('border-accent');
    });

    it('calls onSelect when clicked in checkbox mode', () => {
        const onSelect = vi.fn();
        render(<AnswerOption {...defaultProps} variant="checkbox" onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('does not call onSelect when isDisabled is true', () => {
        const onSelect = vi.fn();
        render(
            <AnswerOption
                {...defaultProps}
                variant="checkbox"
                isDisabled={true}
                onSelect={onSelect}
            />
        );
        const btn = screen.getByRole('checkbox');
        expect(btn).toBeDisabled();
        fireEvent.click(btn);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
