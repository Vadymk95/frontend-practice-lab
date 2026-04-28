import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { FlashKind, FlashState } from './types';

const AUTO_DISMISS_MS = 6000;

export interface UseFlashBannerReturn {
    activeFlash: FlashKind | null;
    dismiss: () => void;
}

export function useFlashBanner(): UseFlashBannerReturn {
    const location = useLocation();
    const navigate = useNavigate();
    const incoming = (location.state as FlashState | null)?.flash ?? null;
    const [activeFlash, setActiveFlash] = useState<FlashKind | null>(incoming);

    // Drop the flash out of router state so a refresh won't re-show it.
    // Deps intentionally narrowed to `incoming`: re-running this effect on
    // every navigate/location change would loop forever (we call navigate
    // inside it). React Router 7 navigate identity is stable, location is
    // intentionally re-read fresh via the navigate call itself.

    useEffect(() => {
        if (incoming === null) return;
        setActiveFlash(incoming);
        navigate(location.pathname, { replace: true, state: null });
    }, [incoming]);

    useEffect(() => {
        if (activeFlash === null) return;
        const id = window.setTimeout(() => setActiveFlash(null), AUTO_DISMISS_MS);
        return () => window.clearTimeout(id);
    }, [activeFlash]);

    const dismiss = useCallback(() => setActiveFlash(null), []);

    return { activeFlash, dismiss };
}
