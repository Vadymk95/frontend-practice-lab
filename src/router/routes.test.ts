import { describe, expect, it } from 'vitest';

import { RoutesPath } from './routes';

describe('RoutesPath', () => {
    it('DevPlayground path is /dev-playground', () => {
        expect(RoutesPath.DevPlayground).toBe('/dev-playground');
    });
});
