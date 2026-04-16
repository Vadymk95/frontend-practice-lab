import { useResetWeightsDialog } from '@/components/features/ResetWeightsDialog';
import { useUiStore } from '@/store/ui';

export const useAppHeader = () => {
    const theme = useUiStore.use.theme();
    const setTheme = useUiStore.use.setTheme();
    const resetDialog = useResetWeightsDialog();
    return { theme, setTheme, resetDialog };
};
