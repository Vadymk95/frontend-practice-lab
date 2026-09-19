import { afterEach, describe, expect, it, vi } from 'vitest';

import { createOptionOrder } from './optionOrder';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createOptionOrder', () => {
    it('returns every index exactly once for a non-empty length', () => {
        const order = createOptionOrder(5);
        expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
    });

    it('returns an empty order for length 0', () => {
        expect(createOptionOrder(0)).toEqual([]);
    });

    it('permutes with Fisher-Yates — lowest draw rotates the identity order', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(createOptionOrder(4)).toEqual([1, 2, 3, 0]);
    });

    it('draws once per swap, never for the first element', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
        createOptionOrder(4);
        expect(random).toHaveBeenCalledTimes(3);
    });
});
