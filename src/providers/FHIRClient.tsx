import { Bundle, Resource } from 'fhir/r4b';
import React, { createContext, ReactNode, useContext } from 'react';
import { getAccessToken, getAuthMode } from '../auth/tokenStore';
import { buildFhirUrl, defaultPartitionId, defaultSearchCount, getAvailablePartitions, partitionResourceMapUrl, usePartitions } from '../config/runtime';

export interface SearchParam {
    name: string;
    value: string;
}

interface FhirClientContextProps {
    searchResource: <T = Bundle>(resourceType: string, parameters?: SearchParam[], partition?: string) => Promise<T>;
    readResource: <T = Resource>(resourceType: string, id: string, partition?: string) => Promise<T>;
    readBundleUrl: <T = Bundle>(url: string) => Promise<T>;
    executeOperation: <T = Bundle>(operationName: string, parameters?: SearchParam[], partition?: string) => Promise<T>;
    executeEverything: (memberId: string, partition?: string) => Promise<Bundle>;
    executeEverythingAcrossPartitions: (memberId: string) => Promise<Bundle>;
    searchAcrossPartitions: (resourceType: string, queryParams?: SearchParam[]) => Promise<Bundle>;
    createResource: <T = Resource>(partition: string | undefined, resourceType: string, resource: Resource) => Promise<T>;
    updateResource: <T = Resource>(partition: string | undefined, resourceType: string, id: string, resource: Resource) => Promise<T>;
    deleteResource: (partition: string | undefined, resourceType: string, id: string) => Promise<void>;
}

const FhirClientContext = createContext<FhirClientContextProps | undefined>(undefined);

const getAuthHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/fhir+json',
    };

    const token = getAccessToken();
    if (getAuthMode() !== 'none' && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

const withDefaultCount = (parameters: SearchParam[] = []): SearchParam[] => {
    const normalized = [...parameters];
    if (!normalized.some((param) => param.name === '_count')) {
        normalized.push({ name: '_count', value: String(defaultSearchCount) });
    }
    return normalized;
};

const buildQueryString = (parameters: SearchParam[] = []): string => (
    parameters
        .map(({ name, value }) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
        .join('&')
);

const getRelevantPartitions = async (resourceType: string): Promise<string[]> => {
    const configured = getAvailablePartitions();

    if (!usePartitions) {
        return [];
    }

    if (configured.length === 0) {
        return defaultPartitionId ? [defaultPartitionId] : [];
    }

    try {
        const partitionRes = await fetch(partitionResourceMapUrl);
        if (!partitionRes.ok) {
            return configured;
        }

        const partitionMap = await partitionRes.json();
        const relevant = Object.values(partitionMap)
            .filter((partition: any) => Array.isArray(partition?.resources) && partition.resources.includes(resourceType))
            .map((partition: any) => String(partition.name))
            .filter(Boolean);

        return relevant.length > 0 ? relevant : configured;
    } catch (error) {
        console.warn('Unable to load partition resource map, falling back to configured partitions:', error);
        return configured;
    }
};

const searchResource = async <T = Bundle>(resourceType: string, parameters: SearchParam[] = [], partition?: string): Promise<T> => {
    const queryString = buildQueryString(withDefaultCount(parameters));
    const url = `${buildFhirUrl(resourceType, partition)}?${queryString}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`FHIR search failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

const readResource = async <T = Resource>(resourceType: string, id: string, partition?: string): Promise<T> => {
    const response = await fetch(buildFhirUrl(`${resourceType}/${id}`, partition), {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`FHIR read failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

const readBundleUrl = async <T = Bundle>(url: string): Promise<T> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`FHIR read failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

const executeOperation = async <T = Bundle>(operationName: string, parameters: SearchParam[] = [], partition?: string): Promise<T> => {
    const queryString = buildQueryString(parameters);
    const url = queryString
        ? `${buildFhirUrl(operationName, partition)}?${queryString}`
        : buildFhirUrl(operationName, partition);

    const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`FHIR operation failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

const executeEverything = async (memberId: string, partition?: string): Promise<Bundle> => {
    const response = await fetch(buildFhirUrl(`Patient/${memberId}/$everything`, partition), {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (response.status === 404) {
        return { resourceType: 'Bundle', type: 'searchset', entry: [] };
    }

    if (!response.ok) {
        throw new Error(`Failed $everything for ${memberId}${partition ? ` in ${partition}` : ''}: ${response.status}`);
    }

    return response.json();
};

export const getPatientIdByIdentifier = async (
    partition: string | undefined,
    identifier: string
): Promise<string | null> => {
    const bundle = await searchResource<Bundle>('Patient', [{
        name: 'identifier',
        value: `http://bluecrossnc.com/fhir/memberidentifier/nchie|${identifier}`,
    }], partition);

    const patient = bundle.entry?.find((entry) => entry.resource?.resourceType === 'Patient')?.resource;
    return patient?.id ?? null;
};

const retry = async <T,>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) {
            throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return retry(fn, retries - 1, delayMs);
    }
};

const executeEverythingAcrossPartitions = async (id: string): Promise<Bundle> => {
    const partitions = getAvailablePartitions();

    if (!usePartitions || partitions.length === 0) {
        return executeEverything(id);
    }

    const resource = await readResource<any>('Patient', id, defaultPartitionId);
    const identifier = resource.identifier?.find(
        (entry: any) => entry.system === 'http://bluecrossnc.com/fhir/memberidentifier/nchie'
    );

    if (!identifier?.value) {
        throw new Error(`No identifier found for patient in ${defaultPartitionId} for ID: ${id}`);
    }

    const bundles = await Promise.all(
        partitions.map(async (partition) => {
            try {
                const patientId = await getPatientIdByIdentifier(partition, identifier.value);
                if (!patientId) {
                    return null;
                }

                return retry(() => executeEverything(patientId, partition));
            } catch (error) {
                console.warn(`Skipping partition ${partition} due to error:`, error);
                return null;
            }
        })
    );

    return {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: bundles
            .filter((bundle): bundle is Bundle => bundle !== null)
            .flatMap((bundle) => bundle.entry || []),
    };
};

const searchAcrossPartitions = async (resourceType: string, queryParams: SearchParam[] = []): Promise<Bundle> => {
    const partitions = await getRelevantPartitions(resourceType);

    if (!usePartitions || partitions.length === 0) {
        return searchResource<Bundle>(resourceType, queryParams);
    }

    const results = await Promise.allSettled(
        partitions.map((partition) => searchResource<Bundle>(resourceType, queryParams, partition))
    );

    const bundles = results
        .filter((result): result is PromiseFulfilledResult<Bundle> => result.status === 'fulfilled')
        .map((result) => result.value);

    const allEntries = bundles.flatMap((bundle) => bundle.entry || []);

    return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: allEntries.length,
        entry: allEntries,
        link: [],
    };
};

const createResource = async <T = Resource>(partition: string | undefined, resourceType: string, resource: Resource): Promise<T> => {
    const response = await fetch(buildFhirUrl(resourceType, partition), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(resource),
    });

    if (!response.ok) {
        throw new Error(`Create failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
};

const updateResource = async <T = Resource>(partition: string | undefined, resourceType: string, id: string, resource: Resource): Promise<T> => {
    const response = await fetch(buildFhirUrl(`${resourceType}/${id}`, partition), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(resource),
    });

    if (!response.ok) {
        throw new Error(`Update failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
};

const deleteResource = async (partition: string | undefined, resourceType: string, id: string): Promise<void> => {
    const response = await fetch(buildFhirUrl(`${resourceType}/${id}`, partition), {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${await response.text()}`);
    }
};

interface FhirClientProviderProps {
    children: ReactNode;
}

export const FhirClientProvider: React.FC<FhirClientProviderProps> = ({ children }) => (
    <FhirClientContext.Provider
        value={{
            searchResource,
            readResource,
            readBundleUrl,
            executeOperation,
            executeEverything,
            executeEverythingAcrossPartitions,
            searchAcrossPartitions,
            createResource,
            updateResource,
            deleteResource,
        }}
    >
        {children}
    </FhirClientContext.Provider>
);

export const useFhirClient = () => {
    const context = useContext(FhirClientContext);
    if (!context) {
        throw new Error('useFhirClient must be used within a FhirClientProvider');
    }
    return context;
};

export {
    createResource,
    deleteResource,
    executeEverything,
    executeEverythingAcrossPartitions,
    executeOperation,
    readBundleUrl,
    readResource,
    searchAcrossPartitions,
    searchResource,
    updateResource,
};
