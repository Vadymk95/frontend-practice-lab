import { useQuery } from '@tanstack/react-query';

export interface ManifestEntry {
    slug: string;
    displayName: string;
    counts: {
        easy: number;
        medium: number;
        hard: number;
        total: number;
    };
}

const MANIFEST_URL = '/data/manifest.json';

export function useCategories() {
    return useQuery({
        queryKey: ['categories', 'manifest'],
        queryFn: async () => {
            const res = await fetch(MANIFEST_URL);
            if (!res.ok) throw new Error('Failed to load categories');
            return res.json() as Promise<ManifestEntry[]>;
        },
        staleTime: Infinity
    });
}
