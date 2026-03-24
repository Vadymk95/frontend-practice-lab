import { useEffect } from 'react';

import { useUiStore } from '@/store/ui';

export function useTheme() {
    const theme = useUiStore.use.theme();
    const setTheme = useUiStore.use.setTheme();
    const initTheme = useUiStore.use.initTheme();

    useEffect(() => {
        initTheme();
    }, [initTheme]);

    return { theme, setTheme };
}
