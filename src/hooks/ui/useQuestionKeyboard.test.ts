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
        fireEvent.keyDown(input, { key: 'a' });
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
        fireEvent.keyDown(textarea, { key: 'a' });
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

    it('does not fire while the shortcuts are disabled', () => {
        renderHook(() =>
            useQuestionKeyboard({
                optionCount: 4,
                onSelectOption,
                onSubmit,
                isAnswered: false,
                enabled: false
            })
        );

        fireEvent.keyDown(document, { key: '1' });
        fireEvent.keyDown(document, { key: 'Enter' });

        expect(onSelectOption).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('ignores keys pressed inside an open dialog', () => {
        renderHook(() =>
            useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
        );

        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        const cancel = document.createElement('button');
        dialog.appendChild(cancel);
        document.body.appendChild(dialog);
        fireEvent.keyDown(cancel, { key: 'Enter' });
        fireEvent.keyDown(cancel, { key: '1' });
        fireEvent.keyDown(cancel, { key: 'a' });
        document.body.removeChild(dialog);

        expect(onSubmit).not.toHaveBeenCalled();
        expect(onSelectOption).not.toHaveBeenCalled();
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
    describe('Enter belongs to the focused control', () => {
        function renderWithTarget(tag: 'button' | 'a') {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
            );
            const el = document.createElement(tag);
            if (tag === 'a') el.setAttribute('href', '#x');
            document.body.appendChild(el);
            return el;
        }

        it('leaves Enter to a focused button so its native activation runs', () => {
            const button = renderWithTarget('button');

            fireEvent.keyDown(button, { key: 'Enter' });
            document.body.removeChild(button);

            expect(onSubmit).not.toHaveBeenCalled();
        });

        it('leaves Enter to a focused link', () => {
            const link = renderWithTarget('a');

            fireEvent.keyDown(link, { key: 'Enter' });
            document.body.removeChild(link);

            expect(onSubmit).not.toHaveBeenCalled();
        });

        it('leaves Enter to a focused custom control with a button role', () => {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: true })
            );
            const el = document.createElement('div');
            el.setAttribute('role', 'button');
            document.body.appendChild(el);

            fireEvent.keyDown(el, { key: 'Enter' });
            document.body.removeChild(el);

            expect(onSubmit).not.toHaveBeenCalled();
        });

        it('still submits on Enter when the page body holds the focus', () => {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
            );

            fireEvent.keyDown(document.body, { key: 'Enter' });

            expect(onSubmit).toHaveBeenCalledOnce();
        });

        it('still selects an option by digit while a control holds the focus', () => {
            const button = renderWithTarget('button');

            fireEvent.keyDown(button, { key: '2' });
            document.body.removeChild(button);

            expect(onSelectOption).toHaveBeenCalledWith(1);
        });
    });

    describe('letter keys mirror the printed option labels', () => {
        it('calls onSelectOption(1) when key "b" is pressed', () => {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
            );

            fireEvent.keyDown(document, { key: 'b' });

            expect(onSelectOption).toHaveBeenCalledWith(1);
        });

        it('accepts the uppercase letter the option label actually prints', () => {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
            );

            fireEvent.keyDown(document, { key: 'D' });

            expect(onSelectOption).toHaveBeenCalledWith(3);
        });

        it('does not select a letter past the last option ("e" with 4 options)', () => {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
            );

            fireEvent.keyDown(document, { key: 'e' });

            expect(onSelectOption).not.toHaveBeenCalled();
        });

        it('does not select a letter once the question is answered', () => {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: true })
            );

            fireEvent.keyDown(document, { key: 'a' });

            expect(onSelectOption).not.toHaveBeenCalled();
        });

        it('leaves a shortcut key held with a modifier to the browser', () => {
            renderHook(() =>
                useQuestionKeyboard({ optionCount: 4, onSelectOption, onSubmit, isAnswered: false })
            );

            fireEvent.keyDown(document, { key: 'a', metaKey: true });
            fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
            fireEvent.keyDown(document, { key: '1', metaKey: true });

            expect(onSelectOption).not.toHaveBeenCalled();
        });
    });
});
