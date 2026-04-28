import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { FlashBanner } from './FlashBanner';

const mockNavigate = vi.fn();
const mockLocation = { pathname: '/', state: null as unknown };

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => mockLocation
    };
});

describe('FlashBanner', () => {
    beforeEach(() => {
        mockNavigate.mockReset();
        mockLocation.state = null;
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders nothing when location.state has no flash', () => {
        const { container } = renderWithProviders(<FlashBanner />);
        expect(container.firstChild).toBeNull();
    });

    it('renders message for sessionEnded flash', () => {
        mockLocation.state = { flash: 'sessionEnded' };
        renderWithProviders(<FlashBanner />);
        expect(screen.getByRole('status')).toHaveTextContent(/session ended/i);
    });

    it('renders message for noActiveSession flash', () => {
        mockLocation.state = { flash: 'noActiveSession' };
        renderWithProviders(<FlashBanner />);
        expect(screen.getByRole('status')).toHaveTextContent(/no active session/i);
    });

    it('renders message for summaryUnavailable flash', () => {
        mockLocation.state = { flash: 'summaryUnavailable' };
        renderWithProviders(<FlashBanner />);
        expect(screen.getByRole('status')).toHaveTextContent(/summary is no longer available/i);
    });

    it('dismisses on close button click', () => {
        mockLocation.state = { flash: 'sessionEnded' };
        renderWithProviders(<FlashBanner />);

        fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('auto-dismisses after 6 seconds', () => {
        mockLocation.state = { flash: 'sessionEnded' };
        renderWithProviders(<FlashBanner />);
        expect(screen.getByRole('status')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(6000);
        });

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('clears the flash from router state on mount so refresh does not re-show it', () => {
        mockLocation.state = { flash: 'sessionEnded' };
        renderWithProviders(<FlashBanner />);

        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true, state: null });
    });
});
