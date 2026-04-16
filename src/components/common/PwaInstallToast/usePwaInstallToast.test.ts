import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { usePwaInstallToast } from './usePwaInstallToast';

// Mock react-router-dom useLocation
const mockLocation = { pathname: '/' };
vi.mock('react-router-dom', () => ({
    useLocation: () => mockLocation
}));

const DISMISSED_KEY = 'pwa_prompt_dismissed';

describe('usePwaInstallToast', () => {
    beforeEach(() => {
        sessionStorage.clear();
        mockLocation.pathname = '/';
    });

    it('is not visible on mount', () => {
        const { result } = renderHook(() => usePwaInstallToast());
        expect(result.current.isVisible).toBe(false);
    });

    it('isAvailable is false when no beforeinstallprompt event fired', () => {
        const { result } = renderHook(() => usePwaInstallToast());
        expect(result.current.isAvailable).toBe(false);
    });

    it('becomes visible after beforeinstallprompt fires and route is /session/summary', async () => {
        const { result, rerender } = renderHook(() => usePwaInstallToast());

        // Fire beforeinstallprompt
        const mockEvent = new Event('beforeinstallprompt') as Event & {
            prompt: () => Promise<void>;
            userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
        };
        mockEvent.preventDefault = vi.fn();
        mockEvent.prompt = vi.fn().mockResolvedValue(undefined);
        mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

        act(() => {
            window.dispatchEvent(mockEvent);
        });

        // Navigate to summary
        mockLocation.pathname = '/session/summary';
        rerender();

        expect(result.current.isVisible).toBe(true);
        expect(result.current.isAvailable).toBe(true);
    });

    it('does not show when already dismissed in session', async () => {
        sessionStorage.setItem(DISMISSED_KEY, '1');
        const { result, rerender } = renderHook(() => usePwaInstallToast());

        const mockEvent = new Event('beforeinstallprompt');
        mockEvent.preventDefault = vi.fn();
        act(() => {
            window.dispatchEvent(mockEvent);
        });

        mockLocation.pathname = '/session/summary';
        rerender();

        expect(result.current.isVisible).toBe(false);
    });

    it('dismiss hides toast and sets sessionStorage flag', () => {
        const { result } = renderHook(() => usePwaInstallToast());

        act(() => {
            result.current.dismiss();
        });

        expect(result.current.isVisible).toBe(false);
        expect(sessionStorage.getItem(DISMISSED_KEY)).toBe('1');
    });

    it('does not show on non-summary routes', async () => {
        const { result, rerender } = renderHook(() => usePwaInstallToast());

        const mockEvent = new Event('beforeinstallprompt');
        mockEvent.preventDefault = vi.fn();
        act(() => {
            window.dispatchEvent(mockEvent);
        });

        mockLocation.pathname = '/session/play';
        rerender();

        expect(result.current.isVisible).toBe(false);
    });
});
