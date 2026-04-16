import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePwaUpdateToast } from './usePwaUpdateToast';

const mockUpdateServiceWorker = vi.fn();
const mockSetter = vi.fn();

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: vi.fn(() => ({
        needRefresh: [false, mockSetter],
        offlineReady: [false, mockSetter],
        updateServiceWorker: mockUpdateServiceWorker
    }))
}));

const { useRegisterSW } = await import('virtual:pwa-register/react');

describe('usePwaUpdateToast', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('isVisible is false when needRefresh is false', () => {
        vi.mocked(useRegisterSW).mockReturnValue({
            needRefresh: [false, mockSetter],
            offlineReady: [false, mockSetter],
            updateServiceWorker: mockUpdateServiceWorker
        });

        const { result } = renderHook(() => usePwaUpdateToast());
        expect(result.current.isVisible).toBe(false);
    });

    it('isVisible is true when needRefresh is true and not dismissed', () => {
        vi.mocked(useRegisterSW).mockReturnValue({
            needRefresh: [true, mockSetter],
            offlineReady: [false, mockSetter],
            updateServiceWorker: mockUpdateServiceWorker
        });

        const { result } = renderHook(() => usePwaUpdateToast());
        expect(result.current.isVisible).toBe(true);
    });

    it('handleDismiss sets dismissed and writes to sessionStorage', () => {
        vi.mocked(useRegisterSW).mockReturnValue({
            needRefresh: [true, mockSetter],
            offlineReady: [false, mockSetter],
            updateServiceWorker: mockUpdateServiceWorker
        });

        const { result } = renderHook(() => usePwaUpdateToast());

        act(() => {
            result.current.handleDismiss();
        });

        expect(result.current.isVisible).toBe(false);
        expect(sessionStorage.getItem('pwa_update_dismissed')).toBe('1');
    });

    it('isVisible is false after handleDismiss', () => {
        vi.mocked(useRegisterSW).mockReturnValue({
            needRefresh: [true, mockSetter],
            offlineReady: [false, mockSetter],
            updateServiceWorker: mockUpdateServiceWorker
        });

        const { result } = renderHook(() => usePwaUpdateToast());
        expect(result.current.isVisible).toBe(true);

        act(() => {
            result.current.handleDismiss();
        });

        expect(result.current.isVisible).toBe(false);
    });

    it('handleUpdate calls updateServiceWorker(true)', () => {
        vi.mocked(useRegisterSW).mockReturnValue({
            needRefresh: [true, mockSetter],
            offlineReady: [false, mockSetter],
            updateServiceWorker: mockUpdateServiceWorker
        });

        const { result } = renderHook(() => usePwaUpdateToast());

        act(() => {
            result.current.handleUpdate();
        });

        expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
    });

    it('isVisible is false when already dismissed (sessionStorage pre-set)', () => {
        sessionStorage.setItem('pwa_update_dismissed', '1');
        vi.mocked(useRegisterSW).mockReturnValue({
            needRefresh: [true, mockSetter],
            offlineReady: [false, mockSetter],
            updateServiceWorker: mockUpdateServiceWorker
        });

        const { result } = renderHook(() => usePwaUpdateToast());
        expect(result.current.isVisible).toBe(false);
    });
});
