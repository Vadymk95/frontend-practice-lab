import { render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import enCommon from '../../../public/locales/en/common.json';
import ruCommon from '../../../public/locales/ru/common.json';

const renderDialogIn = async (lng: 'en' | 'ru') => {
    const instance = createInstance();
    await instance.use(initReactI18next).init({
        lng,
        fallbackLng: lng,
        ns: ['common'],
        defaultNS: 'common',
        resources: { en: { common: enCommon }, ru: { common: ruCommon } },
        interpolation: { escapeValue: false },
        react: { useSuspense: false }
    });

    return render(
        <I18nextProvider i18n={instance}>
            <Dialog open>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Title</DialogTitle>
                        <DialogDescription>Description</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </I18nextProvider>
    );
};

describe('DialogContent close affordance', () => {
    it('labels the close button in the active language', async () => {
        await renderDialogIn('ru');

        expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    });

    it('keeps the English label in an English session', async () => {
        await renderDialogIn('en');

        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
});
