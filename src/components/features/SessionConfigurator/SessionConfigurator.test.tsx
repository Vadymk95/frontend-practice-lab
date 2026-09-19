import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, fireEvent, screen, within } from '@testing-library/react';
import { createInstance } from 'i18next';
import type { ReactNode } from 'react';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ManifestEntry } from '@/hooks/data/useCategories';
import { useCategories } from '@/hooks/data/useCategories';
import { useSessionStore } from '@/store/session';
import { renderWithProviders } from '@/test/test-utils';

import { SessionConfigurator } from './SessionConfigurator';
import {
    computeAvailableCount,
    getFilteredCategoryCount,
    useSessionConfigurator
} from './useSessionConfigurator';
import enHome from '../../../../public/locales/en/home.json';
import ruHome from '../../../../public/locales/ru/home.json';

vi.mock('@/hooks/data/useCategories', () => ({
    useCategories: vi.fn()
}));

const mockCategories: ManifestEntry[] = [
    {
        slug: 'javascript',
        displayName: 'JavaScript',
        counts: {
            easy: 3,
            medium: 2,
            hard: 1,
            total: 6,
            quiz: 4,
            bugFinding: 1,
            codeCompletion: 1
        },
        matrix: {
            easy: { quiz: 2, bugFinding: 0, codeCompletion: 1 },
            medium: { quiz: 1, bugFinding: 1, codeCompletion: 0 },
            hard: { quiz: 1, bugFinding: 0, codeCompletion: 0 }
        }
    },
    {
        slug: 'typescript',
        displayName: 'TypeScript',
        counts: {
            easy: 2,
            medium: 2,
            hard: 2,
            total: 6,
            quiz: 3,
            bugFinding: 2,
            codeCompletion: 1
        },
        matrix: {
            easy: { quiz: 1, bugFinding: 1, codeCompletion: 0 },
            medium: { quiz: 1, bugFinding: 1, codeCompletion: 0 },
            hard: { quiz: 1, bugFinding: 0, codeCompletion: 1 }
        }
    }
];

const EMPTY_MATRIX = {
    easy: { quiz: 0, bugFinding: 0, codeCompletion: 0 },
    medium: { quiz: 0, bugFinding: 0, codeCompletion: 0 },
    hard: { quiz: 0, bugFinding: 0, codeCompletion: 0 }
};

function createWrapper() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    return ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MemoryRouter>
    );
}

describe('getFilteredCategoryCount', () => {
    const js = mockCategories[0];

    it('returns total for difficulty=all mode=all', () => {
        expect(getFilteredCategoryCount(js, 'all', 'all')).toBe(6);
    });

    it('returns difficulty count for specific difficulty, mode=all', () => {
        expect(getFilteredCategoryCount(js, 'easy', 'all')).toBe(3);
        expect(getFilteredCategoryCount(js, 'medium', 'all')).toBe(2);
        expect(getFilteredCategoryCount(js, 'hard', 'all')).toBe(1);
    });

    it('returns the mode column total for mode-only filters', () => {
        expect(getFilteredCategoryCount(js, 'all', 'quiz')).toBe(4);
        expect(getFilteredCategoryCount(js, 'all', 'bug-finding')).toBe(1);
        expect(getFilteredCategoryCount(js, 'all', 'code-completion')).toBe(1);
    });

    it('reports 0 for a difficulty+mode pool that holds no questions', () => {
        // The pool is empty; the old proportional estimate advertised round(3 * 1/6) = 1
        // and let the user start a session that immediately bounced back home.
        expect(getFilteredCategoryCount(js, 'easy', 'bug-finding')).toBe(0);
    });

    it('does not under-report a difficulty+mode pool that does hold questions', () => {
        // The old estimate produced round(2 * 1/6) = 0 and hid the one question that exists.
        expect(getFilteredCategoryCount(mockCategories[1], 'hard', 'code-completion')).toBe(1);
    });

    it('returns the exact matrix cell for every other difficulty+mode pair', () => {
        expect(getFilteredCategoryCount(js, 'easy', 'quiz')).toBe(2);
        expect(getFilteredCategoryCount(js, 'medium', 'bug-finding')).toBe(1);
        expect(getFilteredCategoryCount(js, 'easy', 'code-completion')).toBe(1);
    });

    it('returns 0 when total is 0', () => {
        const empty = {
            slug: 'empty',
            displayName: 'Empty',
            counts: {
                easy: 0,
                medium: 0,
                hard: 0,
                total: 0,
                quiz: 0,
                bugFinding: 0,
                codeCompletion: 0
            },
            matrix: EMPTY_MATRIX
        };
        expect(getFilteredCategoryCount(empty, 'all', 'quiz')).toBe(0);
    });
});

describe('computeAvailableCount', () => {
    it('returns 0 when no slugs selected', () => {
        expect(computeAvailableCount(mockCategories, [], 'all', 'all')).toBe(0);
    });

    it('returns total count for selected category with all filters', () => {
        expect(computeAvailableCount(mockCategories, ['javascript'], 'all', 'all')).toBe(6);
    });

    it('returns difficulty-filtered count', () => {
        expect(computeAvailableCount(mockCategories, ['javascript'], 'easy', 'all')).toBe(3);
    });

    it('sums counts for multiple selected categories', () => {
        expect(
            computeAvailableCount(mockCategories, ['javascript', 'typescript'], 'all', 'all')
        ).toBe(12);
    });

    it('sums exact matrix cells across categories for a difficulty+mode filter', () => {
        // javascript easy/quiz = 2, typescript easy/quiz = 1
        const result = computeAvailableCount(
            mockCategories,
            ['javascript', 'typescript'],
            'easy',
            'quiz'
        );
        expect(result).toBe(3);
    });

    it('returns 0 when the selected categories hold nothing for that difficulty+mode', () => {
        expect(computeAvailableCount(mockCategories, ['javascript'], 'easy', 'bug-finding')).toBe(
            0
        );
    });
});

describe('useSessionConfigurator', () => {
    beforeEach(() => {
        vi.mocked(useCategories).mockReturnValue({
            data: mockCategories,
            isLoading: false,
            isError: false,
            error: null
        } as ReturnType<typeof useCategories>);
        useSessionStore.getState().resetSession();
    });

    it('starts with no categories selected and Start disabled', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        expect(result.current.selectedCategories).toHaveLength(0);
        expect(result.current.isStartEnabled).toBe(false);
    });

    it('toggling a category adds it to selectedCategories', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        expect(result.current.selectedCategories).toContain('javascript');
    });

    it('toggling an already-selected category removes it', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        expect(result.current.selectedCategories).not.toContain('javascript');
    });

    it('availableCount is 0 when no categories selected', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        expect(result.current.availableCount).toBe(0);
    });

    it('isStartEnabled is false when count is 0', () => {
        vi.mocked(useCategories).mockReturnValue({
            data: [
                {
                    slug: 'empty-cat',
                    displayName: 'Empty',
                    counts: {
                        easy: 0,
                        medium: 0,
                        hard: 0,
                        total: 0,
                        quiz: 0,
                        bugFinding: 0,
                        codeCompletion: 0
                    },
                    matrix: EMPTY_MATRIX
                }
            ],
            isLoading: false,
            isError: false,
            error: null
        } as ReturnType<typeof useCategories>);

        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('empty-cat');
        });
        expect(result.current.availableCount).toBe(0);
        expect(result.current.isStartEnabled).toBe(false);
    });

    it('handleStart calls setConfig with correct shape', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleStart();
        });
        const config = useSessionStore.getState().config;
        expect(config).not.toBeNull();
        expect(config?.categories).toContain('javascript');
        expect(config?.difficulty).toBe('all');
        expect(config?.mode).toBe('all');
        expect(config?.order).toBe('random');
    });

    it('categoryCountMap contains counts for all categories', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        expect(result.current.categoryCountMap).toHaveProperty('javascript');
        expect(result.current.categoryCountMap).toHaveProperty('typescript');
        expect(result.current.categoryCountMap['javascript']).toBe(6);
        expect(result.current.categoryCountMap['typescript']).toBe(6);
    });

    it('categoryCountMap updates when difficulty filter changes', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleDifficultyChange('easy');
        });
        // javascript: easy=3, typescript: easy=2
        expect(result.current.categoryCountMap['javascript']).toBe(3);
        expect(result.current.categoryCountMap['typescript']).toBe(2);
    });

    it('categoryCountMap updates when mode filter changes', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleModeChange('quiz');
        });
        // javascript quiz column = 4, typescript quiz column = 3
        expect(result.current.categoryCountMap['javascript']).toBe(4);
        expect(result.current.categoryCountMap['typescript']).toBe(3);
    });

    it('keeps Start disabled when the difficulty+mode pool of the selection is empty', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleDifficultyChange('easy');
        });
        act(() => {
            result.current.handleModeChange('bug-finding');
        });
        expect(result.current.maxCount).toBe(0);
        expect(result.current.isStartEnabled).toBe(false);
    });

    it('keeps a question count the user typed when a later selection raises the maximum', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleQuestionCountChange(3);
        });
        act(() => {
            result.current.handleCategoryToggle('typescript');
        });
        expect(result.current.maxCount).toBe(12);
        expect(result.current.questionCount).toBe(3);
    });

    it('lowers a question count the user typed to the maximum when the pool shrinks', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleCategoryToggle('typescript');
        });
        act(() => {
            result.current.handleQuestionCountChange(10);
        });
        act(() => {
            result.current.handleDifficultyChange('hard');
        });
        // javascript hard = 1, typescript hard = 2
        expect(result.current.maxCount).toBe(3);
        expect(result.current.questionCount).toBe(3);
    });

    it('offers the whole available pool while the count field is still untouched', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        expect(result.current.questionCount).toBe(6);
        act(() => {
            result.current.handleCategoryToggle('typescript');
        });
        expect(result.current.questionCount).toBe(12);
    });

    it('handleQuestionCountChange clamps value between 1 and maxCount', () => {
        const { result } = renderHook(() => useSessionConfigurator(), {
            wrapper: createWrapper()
        });
        act(() => {
            result.current.handleCategoryToggle('javascript');
        });
        act(() => {
            result.current.handleQuestionCountChange(0);
        });
        expect(result.current.questionCount).toBe(1);
        act(() => {
            result.current.handleQuestionCountChange(999);
        });
        expect(result.current.questionCount).toBeLessThanOrEqual(result.current.maxCount);
    });
});

describe('configurator.count.available plural forms', () => {
    const translatorFor = async (lng: 'en' | 'ru') => {
        const instance = createInstance();
        await instance.use(initReactI18next).init({
            lng,
            fallbackLng: lng,
            ns: ['home'],
            defaultNS: 'home',
            resources: { en: { home: enHome }, ru: { home: ruHome } },
            interpolation: { escapeValue: false }
        });
        return (count: number) => instance.t('configurator.count.available', { count });
    };

    it('uses the Russian singular for a count of one', async () => {
        const t = await translatorFor('ru');
        expect(t(1)).toBe('1 вопрос доступен');
    });

    it('uses the Russian few form for two to four', async () => {
        const t = await translatorFor('ru');
        expect(t(2)).toBe('2 вопроса доступно');
        expect(t(3)).toBe('3 вопроса доступно');
    });

    it('uses the Russian many form for five and up, and for the teens', async () => {
        const t = await translatorFor('ru');
        expect(t(5)).toBe('5 вопросов доступно');
        expect(t(11)).toBe('11 вопросов доступно');
        expect(t(955)).toBe('955 вопросов доступно');
    });

    it('uses the Russian singular again for twenty-one', async () => {
        const t = await translatorFor('ru');
        expect(t(21)).toBe('21 вопрос доступен');
    });

    it('switches between singular and plural in English', async () => {
        const t = await translatorFor('en');
        expect(t(1)).toBe('1 question available');
        expect(t(5)).toBe('5 questions available');
    });
});

describe('SessionConfigurator — start affordance', () => {
    beforeEach(() => {
        vi.mocked(useCategories).mockReturnValue({
            data: mockCategories,
            isLoading: false,
            isError: false
        } as unknown as ReturnType<typeof useCategories>);
    });

    it('keeps the hint inside the sticky bar that holds the Start button', () => {
        renderWithProviders(<SessionConfigurator />);

        const stickyBar = screen
            .getAllByRole('button', { name: 'Start Session' })[0]!
            .closest('.fixed');
        expect(stickyBar).not.toBeNull();
        expect(
            within(stickyBar as HTMLElement).getByText('Select at least one category to begin')
        ).toBeInTheDocument();
    });

    it('does not point the category group at a hint that is no longer rendered', () => {
        renderWithProviders(<SessionConfigurator />);

        act(() => {
            screen.getByRole('checkbox', { name: /JavaScript/ }).click();
        });

        const group = screen.getByRole('group', { name: 'Select question categories' });
        expect(screen.queryByText('Select at least one category to begin')).not.toBeInTheDocument();
        const describedBy = group.getAttribute('aria-describedby');
        if (describedBy !== null) {
            describedBy
                .split(' ')
                .forEach((id) => expect(document.getElementById(id)).not.toBeNull());
        }
    });

    it('lets a category name too long for its tile wrap instead of painting over the count', () => {
        renderWithProviders(<SessionConfigurator />);

        // A single unbreakable word ("Производительность" in Russian) has no break
        // opportunity, so with overflow-wrap:normal it runs over the count badge.
        const label = screen.getByText('JavaScript');
        expect(label.className).toContain('wrap-anywhere');
        expect(label.className).not.toContain('wrap-normal');
    });

    it('keeps long category names whole instead of breaking them mid-word', () => {
        renderWithProviders(<SessionConfigurator />);

        const label = screen.getByText('JavaScript');
        expect(label.className).not.toContain('break-words');
        expect(label.className).toContain('hyphens-manual');
    });
});

describe('SessionConfigurator — filter radiogroups', () => {
    beforeEach(() => {
        vi.mocked(useCategories).mockReturnValue({
            data: mockCategories,
            isLoading: false,
            isError: false
        } as unknown as ReturnType<typeof useCategories>);
    });

    const difficultyGroup = () =>
        screen.getByRole('radiogroup', { name: 'Select difficulty level' });

    it('puts the unfiltered option first in every group that offers one', () => {
        renderWithProviders(<SessionConfigurator />);

        const firstOptionOf = (name: string) =>
            within(screen.getByRole('radiogroup', { name })).getAllByRole('radio')[0];

        expect(firstOptionOf('Select difficulty level')).toHaveTextContent('All');
        expect(firstOptionOf('Select question mode')).toHaveTextContent('All');
    });

    it('costs a single tab stop per filter group, landing on the selected option', () => {
        renderWithProviders(<SessionConfigurator />);

        const radios = within(difficultyGroup()).getAllByRole('radio');
        const tabbable = radios.filter((radio) => radio.tabIndex === 0);
        expect(tabbable).toHaveLength(1);
        expect(tabbable[0]).toHaveAttribute('aria-checked', 'true');
    });

    it('moves the selection to the next option when the right arrow is pressed', () => {
        renderWithProviders(<SessionConfigurator />);

        const group = difficultyGroup();
        const all = within(group).getByRole('radio', { name: 'All' });
        act(() => all.focus());
        fireEvent.keyDown(all, { key: 'ArrowRight' });

        const easy = within(group).getByRole('radio', { name: 'Easy' });
        expect(easy).toHaveAttribute('aria-checked', 'true');
        expect(all).toHaveAttribute('aria-checked', 'false');
        expect(document.activeElement).toBe(easy);
    });

    it('wraps to the last option when the left arrow is pressed on the first', () => {
        renderWithProviders(<SessionConfigurator />);

        const group = difficultyGroup();
        const all = within(group).getByRole('radio', { name: 'All' });
        act(() => all.focus());
        fireEvent.keyDown(all, { key: 'ArrowLeft' });

        const hard = within(group).getByRole('radio', { name: 'Hard' });
        expect(hard).toHaveAttribute('aria-checked', 'true');
        expect(document.activeElement).toBe(hard);
    });

    it('jumps to the first and last option with Home and End', () => {
        renderWithProviders(<SessionConfigurator />);

        const group = difficultyGroup();
        const all = within(group).getByRole('radio', { name: 'All' });
        act(() => all.focus());
        fireEvent.keyDown(all, { key: 'End' });
        expect(within(group).getByRole('radio', { name: 'Hard' })).toHaveAttribute(
            'aria-checked',
            'true'
        );

        fireEvent.keyDown(within(group).getByRole('radio', { name: 'Hard' }), { key: 'Home' });
        expect(within(group).getByRole('radio', { name: 'All' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
    });

    it('arrows through the mode and order groups too', () => {
        renderWithProviders(<SessionConfigurator />);

        const modeGroup = screen.getByRole('radiogroup', { name: 'Select question mode' });
        const modeRadios = within(modeGroup).getAllByRole('radio');
        const checkedMode = modeRadios.find(
            (radio) => radio.getAttribute('aria-checked') === 'true'
        )!;
        act(() => checkedMode.focus());
        fireEvent.keyDown(checkedMode, { key: 'ArrowRight' });
        expect(checkedMode).toHaveAttribute('aria-checked', 'false');

        const orderGroup = screen.getByRole('radiogroup', { name: 'Select question order' });
        const random = within(orderGroup).getByRole('radio', { name: 'Random' });
        act(() => random.focus());
        fireEvent.keyDown(random, { key: 'ArrowDown' });
        expect(within(orderGroup).getByRole('radio', { name: 'Sequential' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
    });
});
