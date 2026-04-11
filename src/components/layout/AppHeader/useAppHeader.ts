import { useUiStore } from '@/store/ui';

export const useAppHeader = () => {
    const theme = useUiStore.use.theme();
    const setTheme = useUiStore.use.setTheme();
    return { theme, setTheme };
};
