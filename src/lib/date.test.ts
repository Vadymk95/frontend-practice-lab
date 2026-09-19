import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { isYesterday, toLocalDayKey } from './date';

const ORIGINAL_TZ = process.env.TZ;

/**
 * The defect these suites pin is a UTC-vs-local mismatch, so it only shows up away from UTC and on
 * a DST boundary — hence two zones on opposite sides of UTC with different fall-back dates. Node
 * re-reads `process.env.TZ` on every Date operation, so assigning it inside the suite is enough;
 * running the file under `TZ=Europe/Kyiv` or `TZ=America/New_York` is not required and would not
 * add coverage.
 */
function describeTimeZone(timeZone: string, run: () => void) {
    describe(timeZone, () => {
        beforeAll(() => {
            process.env.TZ = timeZone;
        });

        afterAll(() => {
            if (ORIGINAL_TZ === undefined) delete process.env.TZ;
            else process.env.TZ = ORIGINAL_TZ;
        });

        run();
    });
}

describe('toLocalDayKey', () => {
    describeTimeZone('Europe/Kyiv', () => {
        it('gives the same key at 02:00 and at 22:00 of one local day', () => {
            expect(toLocalDayKey(new Date(2026, 9, 6, 2, 0, 0))).toBe('2026-10-06');
            expect(toLocalDayKey(new Date(2026, 9, 6, 22, 0, 0))).toBe('2026-10-06');
        });
    });

    describeTimeZone('America/New_York', () => {
        it('gives the same key at 02:00 and at 22:00 of one local day', () => {
            expect(toLocalDayKey(new Date(2026, 9, 6, 2, 0, 0))).toBe('2026-10-06');
            expect(toLocalDayKey(new Date(2026, 9, 6, 22, 0, 0))).toBe('2026-10-06');
        });
    });

    it('zero-pads month and day', () => {
        expect(toLocalDayKey(new Date(2026, 0, 3, 12, 0, 0))).toBe('2026-01-03');
    });
});

describe('isYesterday', () => {
    it('returns false for an empty date (first ever session)', () => {
        expect(isYesterday('', '2026-10-06')).toBe(false);
    });

    it('returns false for the same day', () => {
        expect(isYesterday('2026-10-06', '2026-10-06')).toBe(false);
    });

    it('returns true for plain consecutive days', () => {
        expect(isYesterday('2026-10-05', '2026-10-06')).toBe(true);
    });

    it('returns true across a month boundary', () => {
        expect(isYesterday('2026-09-30', '2026-10-01')).toBe(true);
    });

    describeTimeZone('Europe/Kyiv', () => {
        // Clocks go back on 2026-10-25
        it('counts the day before the DST fall-back as yesterday', () => {
            expect(isYesterday('2026-10-25', '2026-10-26')).toBe(true);
        });

        it('does not count two days before the DST fall-back as yesterday', () => {
            expect(isYesterday('2026-10-24', '2026-10-26')).toBe(false);
        });
    });

    describeTimeZone('America/New_York', () => {
        // Clocks go back on 2026-11-01
        it('counts the day before the DST fall-back as yesterday', () => {
            expect(isYesterday('2026-11-01', '2026-11-02')).toBe(true);
        });

        it('does not count two days before the DST fall-back as yesterday', () => {
            expect(isYesterday('2026-10-31', '2026-11-02')).toBe(false);
        });
    });
});
