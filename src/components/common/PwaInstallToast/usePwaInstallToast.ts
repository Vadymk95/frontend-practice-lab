import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { track } from '@/lib/analytics';
import { RoutesPath } from '@/router/routes';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_prompt_dismissed';

export const usePwaInstallToast = () => {
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();
    const installPromptTrackedRef = useRef(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setPromptEvent(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        if (
            location.pathname === RoutesPath.SessionSummary &&
            promptEvent !== null &&
            !sessionStorage.getItem(DISMISSED_KEY)
        ) {
            setIsVisible(true);
            if (!installPromptTrackedRef.current) {
                installPromptTrackedRef.current = true;
                track('pwa_install_prompt', {});
            }
        }
    }, [location.pathname, promptEvent]);

    const dismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem(DISMISSED_KEY, '1');
    };

    const install = async () => {
        if (!promptEvent) return;
        await promptEvent.prompt();
        const result = await promptEvent.userChoice;
        if (result.outcome === 'accepted') {
            dismiss();
        }
    };

    return { isVisible, dismiss, install, isAvailable: promptEvent !== null };
};
