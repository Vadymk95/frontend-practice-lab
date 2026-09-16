import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/lib/i18n';
import { DEFAULT_LANGUAGE } from '@/lib/i18n/constants';
import { useUiStore } from '@/store/ui';
// Side-effect import: initialises the shared i18next instance with in-memory
// resources, so changeLanguage resolves without the HTTP backend.
import '@/test/test-utils';

import { normalizeLanguage, useLanguage } from './useLanguage';

// The shared i18next instance carries the HTTP backend from `@/lib/i18n`, so a
// language switch would try to load /locales/**; answer it from memory instead.
beforeEach(() => {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('{}')
        })
    );
});

afterEach(async () => {
    await act(async () => {
        await i18n.changeLanguage(DEFAULT_LANGUAGE);
    });
    vi.unstubAllGlobals();
});

describe('normalizeLanguage', () => {
    it('keeps a supported language', () => {
        expect(normalizeLanguage('en')).toBe('en');
    });

    it('strips the region subtag', () => {
        expect(normalizeLanguage('en-GB')).toBe('en');
    });

    it('falls back to the default for anything unsupported or missing', () => {
        expect(normalizeLanguage('fr')).toBe(DEFAULT_LANGUAGE);
        expect(normalizeLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    });
});

describe('useLanguage', () => {
    it('follows the language i18next is rendering, including a later switch', async () => {
        await act(async () => {
            await i18n.changeLanguage('ru');
        });
        const { result } = renderHook(() => useLanguage());
        expect(result.current.language).toBe('ru');

        await act(async () => {
            await i18n.changeLanguage('en');
        });

        expect(result.current.language).toBe('en');
    });

    it('switches i18next and persists the choice', async () => {
        const { result } = renderHook(() => useLanguage());

        await act(async () => {
            result.current.changeLanguage('en');
        });

        expect(i18n.language).toBe('en');
        expect(result.current.language).toBe('en');
        expect(useUiStore.getState().language).toBe('en');
    });
});
