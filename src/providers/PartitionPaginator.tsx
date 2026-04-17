import { useState, useEffect, useCallback } from 'react';
import { useFhirClient } from './FHIRClient';
import { Bundle, BundleEntry, FhirResource } from 'fhir/r4';

type SearchParam = {
    name: string;
    value: string;
};

type PartitionPagingContext = {
    partition: string;
    nextUrl?: string;
    exhausted: boolean;
};

type FhirResourceEntry = {
    resource: any;
};

export function usePartitionPaginator(resourceType: string, searchParams: SearchParam[], pageSize: number = 50) {
    const { searchResource, readBundleUrl } = useFhirClient();
    const [contexts, setContexts] = useState<PartitionPagingContext[]>([]);
    const [results, setResults] = useState<FhirResourceEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);

    // Initialize contexts on load
    useEffect(() => {
        const partitions = import.meta.env.VITE_APP_BCNC_PARTITIONS_LIST.split('.');
        const initialContexts = partitions.map((partition: any) => ({
            partition,
            nextUrl: null,
            exhausted: false
        }));
        setContexts(initialContexts);
        setResults([]);
        setHasNextPage(true);
    }, [resourceType, JSON.stringify(searchParams)]);

    const dedupeFhirResources = (entries: FhirResourceEntry[]) => {
        const seen = new Set<string>();
        const deduped: FhirResourceEntry[] = [];

        for (const entry of entries) {
            const res = entry.resource;
            const key = `${res.resourceType}/${res.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(entry);
            }
        }

        return deduped;
    };

    const goToNextPage = useCallback(async () => {
        if (loading || !hasNextPage) return;
        setLoading(true);

        const newContexts: PartitionPagingContext[] = [];
        let collected: FhirResourceEntry[] = [];

        for (const context of contexts) {
            if (collected.length >= pageSize) {
                newContexts.push(context);
                continue;
            }

            try {
                let bundle: Bundle;
                if (!context.nextUrl) {
                    const params = [...searchParams, { name: '_count', value: String(pageSize) }];
                    bundle = await searchResource(resourceType, params, context.partition);
                } else {
                    bundle = await readBundleUrl(context.nextUrl, '');
                }

                const nextLink = bundle.link?.find((l: any) => l.relation === 'next')?.url;
                const entries = (bundle.entry || []).map((entry: BundleEntry<FhirResource>) => ({
                    resource: entry.resource
                })) as FhirResourceEntry[];
                collected = collected.concat(entries);

                newContexts.push({
                    ...context,
                    nextUrl: nextLink,
                    exhausted: !nextLink
                });
            } catch (error) {
                console.warn(`Failed to fetch for partition ${context.partition}:`, error);
                newContexts.push({ ...context, exhausted: true });
            }
        }

        const deduped = dedupeFhirResources([...results, ...collected]).slice(0, results.length + pageSize);
        setResults(deduped);
        setContexts(newContexts);
        setLoading(false);
        setHasNextPage(deduped.length > results.length);
    }, [contexts, searchParams, loading, resourceType, pageSize, results]);

    return {
        results,
        loading,
        hasNextPage,
        goToNextPage
    };
}
