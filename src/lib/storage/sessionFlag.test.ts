import { afterEach, describe, expect, it, vi } from 'vitest';

import { readSessionFlag, writeSessionFlag } from './sessionFlag';

const KEY = 'test_flag';

afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
});

describe('readSessionFlag', () => {
    it('returns false when the flag was never written', () => {
        expect(readSessionFlag(KEY)).toBe(false);
    });

    it('returns true once the flag is written', () => {
        writeSessionFlag(KEY);
        expect(readSessionFlag(KEY)).toBe(true);
    });

    it('returns false instead of throwing when storage access is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        });

        expect(() => readSessionFlag(KEY)).not.toThrow();
        expect(readSessionFlag(KEY)).toBe(false);
    });
});

describe('writeSessionFlag', () => {
    it('does not throw when storage access is blocked', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        });

        expect(() => writeSessionFlag(KEY)).not.toThrow();
    });
});
