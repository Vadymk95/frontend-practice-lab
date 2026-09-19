import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question } from '@/lib/data/schema';
import { RoutesPath } from '@/router/routes';
import { useSessionStoreBase } from '@/store/session/sessionStore';

import { usePwaUpdateToast } from './usePwaUpdateToast';

const mockLocation = { pathname: RoutesPath.Root as string };
vi.mock('react-router-dom', () => ({
    useLocation: () => mockLocation
}));

const needRefreshSW = () => {
    vi.mocked(useRegisterSW).mockReturnValue({
        needRefresh: [true, mockSetter],
        offlineReady: [false, mockSetter],
        updateServiceWorker: mockUpdateServiceWorker
    });
};

const mockQuestion = { id: 'q-1' } as unknown as Question;

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
        mockLocation.pathname = RoutesPath.Root;
        useSessionStoreBase.getState().resetSession();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        sessionStorage.clear();
        useSessionStoreBase.getState().resetSession();
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

describe('usePwaUpdateToast — blocked storage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.pathname = RoutesPath.Root;
        useSessionStoreBase.getState().resetSession();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        useSessionStoreBase.getState().resetSession();
    });

    it('renders instead of throwing when reading sessionStorage throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        });
        needRefreshSW();

        const { result } = renderHook(() => usePwaUpdateToast());

        expect(result.current.isVisible).toBe(true);
    });

    it('does not throw when writing the dismissal throws', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        });
        needRefreshSW();

        const { result } = renderHook(() => usePwaUpdateToast());

        act(() => {
            result.current.handleDismiss();
        });

        expect(result.current.isVisible).toBe(false);
    });
});

describe('usePwaUpdateToast — in-flight session', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
        mockLocation.pathname = RoutesPath.Root;
        useSessionStoreBase.getState().resetSession();
        needRefreshSW();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        sessionStorage.clear();
        useSessionStoreBase.getState().resetSession();
    });

    it('stays hidden on the play route while questions are loaded', () => {
        // Accepting the toast reloads the document, and the session store is in-memory only:
        // the answers, the timer and the score of the in-flight session would be gone.
        mockLocation.pathname = RoutesPath.SessionPlay;
        useSessionStoreBase.setState({ questionList: [mockQuestion] });

        const { result } = renderHook(() => usePwaUpdateToast());

        expect(result.current.isVisible).toBe(false);
    });

    it('shows again on the summary route after the session is finished', () => {
        mockLocation.pathname = RoutesPath.SessionSummary;
        useSessionStoreBase.setState({ questionList: [mockQuestion] });

        const { result } = renderHook(() => usePwaUpdateToast());

        expect(result.current.isVisible).toBe(true);
    });

    it('shows on the play route when no questions are loaded', () => {
        mockLocation.pathname = RoutesPath.SessionPlay;

        const { result } = renderHook(() => usePwaUpdateToast());

        expect(result.current.isVisible).toBe(true);
    });
});
