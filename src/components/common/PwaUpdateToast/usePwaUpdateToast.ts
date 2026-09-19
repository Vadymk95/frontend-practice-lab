import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { track } from '@/lib/analytics';
import { readSessionFlag, writeSessionFlag } from '@/lib/storage/sessionFlag';
import { RoutesPath } from '@/router/routes';
import { useSessionStore } from '@/store/session';

const DISMISSED_KEY = 'pwa_update_dismissed';

export const usePwaUpdateToast = () => {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker
    } = useRegisterSW();

    const [dismissed, setDismissed] = useState(() => readSessionFlag(DISMISSED_KEY));
    const { pathname } = useLocation();
    const questionList = useSessionStore.use.questionList();

    // Accepting the update reloads the document and the session store is in-memory only, so the
    // whole in-flight session would be lost. Hold the toast back until the user leaves the player.
    const isSessionInProgress = questionList.length > 0 && pathname === RoutesPath.SessionPlay;

    const isVisible = needRefresh && !dismissed && !isSessionInProgress;

    const handleUpdate = () => {
        track('pwa_update_applied', {});
        void updateServiceWorker(true);
    };

    const handleDismiss = () => {
        setDismissed(true);
        writeSessionFlag(DISMISSED_KEY);
    };

    return { isVisible, handleUpdate, handleDismiss };
};
