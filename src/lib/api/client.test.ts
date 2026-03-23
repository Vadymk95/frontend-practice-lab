import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './client';

describe('apiClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns undefined for 204 responses', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(null, {
                status: 204
            })
        );

        const result = await apiClient<void>('/example');
        expect(result).toBeUndefined();
    });

    it('returns plain text for non-json success responses', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('ok', {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain'
                }
            })
        );

        const result = await apiClient<string>('/health');
        expect(result).toBe('ok');
    });
});
