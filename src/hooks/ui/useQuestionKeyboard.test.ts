import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQuestionKeyboard } from './useQuestionKeyboard';

describe('useQuestionKeyboard', () => {
    const onSelectOption = vi.fn();
    const onSubmit = vi.fn();

    beforeEach(() => {
        onSelectOption.mockReset();
        onSubmit.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('calls onSelectOption(0) when key "1" is pressed', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        fireEvent.keyDown(document, { key: '1' });

        expect(onSelectOption).toHaveBeenCalledWith(0);
    });

    it('calls onSelectOption(3) when key "4" is pressed with 4 options', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        fireEvent.keyDown(document, { key: '4' });

        expect(onSelectOption).toHaveBeenCalledWith(3);
    });

    it('does not select option when key is out of range (key "5" with 4 options)', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        fireEvent.keyDown(document, { key: '5' });

        expect(onSelectOption).not.toHaveBeenCalled();
    });

    it('does not select option when key "0" is pressed', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        fireEvent.keyDown(document, { key: '0' });

        expect(onSelectOption).not.toHaveBeenCalled();
    });

    it('calls onSubmit when Enter is pressed', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        fireEvent.keyDown(document, { key: 'Enter' });

        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('calls onSubmit when Enter is pressed even when isAnswered is true', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: true })
        );

        fireEvent.keyDown(document, { key: 'Enter' });

        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('does not call onSelectOption when isAnswered is true', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: true })
        );

        fireEvent.keyDown(document, { key: '1' });

        expect(onSelectOption).not.toHaveBeenCalled();
    });

    it('does not fire when typing in an HTMLInputElement', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        const input = document.createElement('input');
        document.body.appendChild(input);
        fireEvent.keyDown(input, { key: '1' });
        fireEvent.keyDown(input, { key: 'Enter' });
        document.body.removeChild(input);

        expect(onSelectOption).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not fire when typing in an HTMLTextAreaElement', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        fireEvent.keyDown(textarea, { key: '1' });
        fireEvent.keyDown(textarea, { key: 'Enter' });
        document.body.removeChild(textarea);

        expect(onSelectOption).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('cleans up event listener on unmount', () => {
        const { unmount } = renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        unmount();

        fireEvent.keyDown(document, { key: '1' });
        fireEvent.keyDown(document, { key: 'Enter' });

        expect(onSelectOption).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('works correctly with 2 options', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 2, onSelectOption, onSubmit, isAnswered: false })
        );

        fireEvent.keyDown(document, { key: '1' });
        fireEvent.keyDown(document, { key: '2' });
        fireEvent.keyDown(document, { key: '3' });

        expect(onSelectOption).toHaveBeenCalledTimes(2);
        expect(onSelectOption).toHaveBeenNthCalledWith(1, 0);
        expect(onSelectOption).toHaveBeenNthCalledWith(2, 1);
    });
});
