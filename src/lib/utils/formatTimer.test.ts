import { describe, expect, it } from 'vitest';

import { formatTimer } from './formatTimer';

describe('formatTimer', () => {
    it('formats 0ms as 00:00', () => {
        expect(formatTimer(0)).toBe('00:00');
    });

    it('formats 1000ms as 00:01', () => {
        expect(formatTimer(1000)).toBe('00:01');
    });

    it('formats 59000ms as 00:59', () => {
        expect(formatTimer(59000)).toBe('00:59');
    });

    it('formats 60000ms as 01:00', () => {
        expect(formatTimer(60000)).toBe('01:00');
    });

    it('formats 90500ms as 01:30', () => {
        expect(formatTimer(90500)).toBe('01:30');
    });

    it('formats 3600000ms as 60:00', () => {
        expect(formatTimer(3600000)).toBe('60:00');
    });

    it('pads seconds below 10 with leading zero', () => {
        expect(formatTimer(5000)).toBe('00:05');
    });

    it('pads minutes below 10 with leading zero', () => {
        expect(formatTimer(65000)).toBe('01:05');
    });
});
