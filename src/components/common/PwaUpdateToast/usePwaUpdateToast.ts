import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { track } from '@/lib/analytics';

const DISMISSED_KEY = 'pwa_update_dismissed';

export const usePwaUpdateToast = () => {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker
    } = useRegisterSW();

    const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === '1');

    const isVisible = needRefresh && !dismissed;

    const handleUpdate = () => {
        track('pwa_update_applied', {});
        void updateServiceWorker(true);
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem(DISMISSED_KEY, '1');
    };

    return { isVisible, handleUpdate, handleDismiss };
};
