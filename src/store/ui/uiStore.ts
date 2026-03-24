import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { storageService } from '@/lib/storage';
import { createSelectors } from '@/store/utils/createSelectors';

interface UiState {
    theme: 'dark' | 'light';
    language: 'ru' | 'en';
    // Actions
    setTheme: (theme: 'dark' | 'light') => void;
    setLanguage: (language: 'ru' | 'en') => void;
    initTheme: () => void;
}

const useUiStoreBase = create<UiState>()(
    devtools(
        (set) => ({
            theme: 'dark',
            language: storageService.getLanguage(),

            setTheme: (theme: 'dark' | 'light') => {
                document.documentElement.classList.toggle('dark', theme === 'dark');
                storageService.setTheme(theme);
                set({ theme }, false, { type: 'ui-store/setTheme' });
            },
            setLanguage: (language: 'ru' | 'en') => {
                storageService.setLanguage(language);
                set({ language }, false, { type: 'ui-store/setLanguage' });
            },
            initTheme: () => {
                const theme = storageService.getTheme();
                document.documentElement.classList.toggle('dark', theme === 'dark');
                set({ theme }, false, { type: 'ui-store/initTheme' });
            }
        }),
        { name: 'ui-store' }
    )
);

export const useUiStore = createSelectors(useUiStoreBase);
