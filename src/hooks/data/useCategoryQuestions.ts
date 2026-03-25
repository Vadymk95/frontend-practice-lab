import { useQueries } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import type { Question } from '@/lib/data/schema';
import { CategoryFileSchema } from '@/lib/data/schema';

function fetchCategoryQuestions(slug: string): Promise<Question[]> {
    return fetch(`/data/${slug}.json`)
        .then((res) => {
            if (!res.ok) throw new Error(`Failed to load category: ${slug}`);
            return res.json();
        })
        .then((data) => CategoryFileSchema.parse(data));
}

export function useCategoryQuestions(slugs: string[]) {
    const results = useQueries({
        queries: slugs.map((slug) => ({
            queryKey: ['questions', slug],
            queryFn: () => fetchCategoryQuestions(slug),
            staleTime: Infinity
        }))
    });

    const isLoading = results.some((r) => r.isLoading);
    const isError = results.some((r) => r.isError);
    const data: Question[] = results.filter((r) => r.data).flatMap((r) => r.data as Question[]);

    const resultsRef = useRef(results);
    resultsRef.current = results;
    const refetch = useCallback(() => resultsRef.current.forEach((r) => r.refetch()), []);

    return { data, isLoading, isError, refetch };
}
