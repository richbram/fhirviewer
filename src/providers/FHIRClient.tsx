import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { Bundle, Resource } from 'fhir/r4b';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface SearchParam {
    name: string;
    value: string;
}

interface FhirClientContextProps {
    searchResource: <T>(resourceType: string, parameters: SearchParam[], partition: string) => Promise<T>;
    readResource: <T>(resourceType: string, id: string) => Promise<T>;
    readBundleUrl: <T>(url: string) => Promise<T>;
    executeOperation: <T>(operationName: string, parameters: SearchParam[]) => Promise<T>;
    executeEverything: <T>(memberId: string, partition: string) => Promise<T>;
    executeEverythingAcrossPartitions: <T>(memberId: string) => Promise<T>;
    searchAcrossPartitions: <T>(resourceType: string, queryParams: SearchParam[]) => Promise<T>;
    createResource: (partition: string, resourceType: string, resource: Resource) => Promise<T>;
    updateResource: (partition: string, resourceType: string, id: string, resource: Resource) => Promise<T>;
    deleteResource: (partition: string, resourceType: string, id: string) => Promise<T>;
}


const searchAcrossPartitions = async (
    resourceType: string,
    queryParams: SearchParam[]
): Promise<Bundle> => {
    const partitionRes = await fetch('/config/partition-resource-map.json');
    const partitionMap = await partitionRes.json();

    const relevantPartitionNames = Object.entries(partitionMap)
        .filter(([_, partition]: [string, any]) =>
            partition.resources && partition.resources.includes(resourceType)
        )
        .map(([_, partition]) => partition.name);


    const results = await Promise.allSettled(
        relevantPartitionNames.map(async (partitionId) => {
            try {
                console.log(`Searching partition ${partitionId} for resource type ${resourceType}`);


                //partitionParams.push({ name: "_partition", value: partitionId });

                return await searchResource(resourceType, queryParams, partitionId);
            } catch (error) {
                console.warn(`Search failed for partition ${partitionId}:`, error);
                throw error;
            }
        })
    );

    const bundles = results
        .filter((r): r is PromiseFulfilledResult<Bundle> => r.status === 'fulfilled')
        .map(r => r.value);

    const allEntries = bundles.flatMap(b => b.entry || []);

    return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: allEntries.length,
        entry: allEntries,
        link: []
    };
};


const FhirClientContext = createContext<FhirClientContextProps | undefined>(undefined);
let accessToken: string | null = null;
const useAccessToken = (scopes: string[] = [import.meta.env.VITE_APP_BCNC_SCOPE]) => {
    const { instance, accounts } = useMsal();
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const getToken = async () => {
            if (!accounts || accounts.length === 0) return;

            try {
                const result = await instance.acquireTokenSilent({
                    account: accounts[0],
                    scopes
                });
                setToken(result.accessToken);
                accessToken = result.accessToken;
            } catch (error) {
                if (error instanceof InteractionRequiredAuthError) {
                    await instance.loginRedirect({ scopes });
                } else {
                    console.error('Failed to acquire token silently:', error);
                }
            }
        };

        getToken();
    }, [accounts, instance, scopes]);

    return token;
};

const getAuthHeaders = (): HeadersInit => ({
    'Content-Type': 'application/fhir+json',
    Authorization: `Bearer ${accessToken || ''}`
});

interface FhirClientProviderProps {
    children: ReactNode;
}


const searchResource = async <T,>(resourceType: string, parameters: SearchParam[], partition?: string): Promise<T> => {
    parameters.push({ name: "_count", value: '50' });
    const queryString = parameters
        .map(({ name, value }) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
        .join('&');

    if (!partition) {
        partition = "nchie";
    }

    const url = `${import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT}${partition}/${resourceType}?${queryString}`;
    //console.log ("searching fhir server" + url + " with" + parameters)
    const headers = getAuthHeaders();
    //console.log("with headers:" + headers)

    const response = await fetch(url, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        throw new Error(`FHIR search failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};


const readResource = async <T,>(resourceType: string, id: string): Promise<T> => {

    const url = `${import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT + import.meta.env.VITE_APP_BCNC_PARTITION_ID}/${resourceType}/${id}`;
    // console.log(url);
    const headers = getAuthHeaders();


    const response = await fetch(url, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        throw new Error(`FHIR read failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

const readBundleUrl = async <T,>(url: string): Promise<T> => {

    // console.log(url);
    const headers = getAuthHeaders();

    const response = await fetch(url, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        throw new Error(`FHIR read failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};


const executeOperation = async <T,>(operationName: string, parameters: SearchParam[]): Promise<T> => {
    const queryString = parameters.map(({ name, value }) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&');

    const url = `${import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT + import.meta.env.VITE_APP_BCNC_PARTITION_ID}/${operationName}?${queryString}`;
    // console.log('executing fhir operation' + url + ' with' + parameters);
    const headers = getAuthHeaders();


    const response = await fetch(url, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        throw new Error(`FHIR operation failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

const executeEverything = async (memberId: string, partition: string): Promise<T> => {


    const url = `${import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT}${partition}/Patient/${memberId}/$everything`;
    const headers = getAuthHeaders();

    // console.log('with headers:' + JSON.stringify(headers));
    const res = await fetch(url, {
        method: 'GET',
        headers
    });

    if (res.status === 404) {
        console.warn(`No data for member ${memberId} in ${partition}`);
        return { resourceType: 'Bundle', type: 'searchset', entry: [] };
    }

    if (!res.ok) {
        throw new Error(`Failed $everything for ${memberId} in ${partition}: ${res.status}`);
    }

    return res.json();
};


const executeEverythingAcrossPartitions = async (id: string): Promise<Bundle> => {
    const partitions = getAvailablePartitions();

    // Read the resource to get the identifier
    const resource = await readResource<any>('Patient', id);
    const identifier = resource.identifier.find((id: any) => id.system === 'http://bluecrossnc.com/fhir/memberidentifier/nchie');

    if (!identifier) {
        throw new Error(`No identifier found for patient in NCHIE partition for ID: ${id}`);
    }

    const promises = partitions.map(async (partition) => {
        try {
            const patientId = await getPatientIdByIdentifier(partition, identifier.value);
            if (!patientId) {
                console.warn(`No patient ID found for partition ${partition}`);
                return null;
            }

            return await retry<Bundle>(() => executeEverything(patientId, partition));
        } catch (error) {
            console.warn(`Skipping partition ${partition} due to error:`, error);
            return null;
        }
    });

    const bundles = await Promise.all(promises);

    const allEntries = bundles
        .filter((b: Bundle): b is Bundle => b !== null)
        .flatMap((b: { entry: any; }) => b.entry || []);

    return {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: allEntries,
    };
};
    




const getAvailablePartitions = (): string[] => {
    return (import.meta.env.VITE_APP_BCNC_PARTITIONS_LIST).split('.');
};

export const getPatientIdByIdentifier = async (
    partition: string,
    identifier: string
): Promise<string | null> => {
    const searchParams = [{
        "name": "identifier", // auto-encoded by your FHIR client
        "value": "http://bluecrossnc.com/fhir/memberidentifier/nchie|" + identifier
    }];

    const bundle: Bundle = await searchResource('Patient', searchParams, partition);

    const patient = bundle.entry?.find(
        (e) => e.resource?.resourceType === 'Patient'
    )?.resource;

    return patient?.id ?? null;
};
  

const retry = async (fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> => {
    try {
        return await fn();
    }
    catch (error) {
        if (retries <= 0) throw error;
        console.warn(`Retrying after error: ${error}`);
        await new Promise(res => setTimeout(res, delayMs));
        return await retry(fn, retries - 1, delayMs); // Added await here
    }
};


export const FhirClientProvider: React.FC<FhirClientProviderProps> = ({ children }) => {
    useAccessToken();

    return (
        <FhirClientContext.Provider
            value={{
                searchResource: (resourceType, parameters, partition) => searchResource(resourceType, parameters, partition),
                readResource: (resourceType, id) => readResource(resourceType, id),
                readBundleUrl: (url) => readBundleUrl(url),
                executeOperation: (operationName, parameters) => executeOperation(operationName, parameters),
                executeEverything: (memberId, partition) => executeEverything(memberId, partition),
                executeEverythingAcrossPartitions: (memberId: string) => executeEverythingAcrossPartitions(memberId),
                searchAcrossPartitions: (resourceType, queryParams) => searchAcrossPartitions(resourceType, queryParams),
                createResource: (partition, resourceType, resource) => createResource(partition, resourceType, resource),
                updateResource: (partition, resourceType, id, resource) => updateResource(partition, resourceType, id, resource),
                deleteResource: (partition, resourceType, id) => deleteResource(partition, resourceType, id)
            }}
        >
            {children}
        </FhirClientContext.Provider>
    );

};


export const useFhirClient = () => {
    const context = useContext(FhirClientContext);
    if (!context) {
        throw new Error('useFhirClient must be used within a FhirClientProvider');
    }
    return context;
};

const createResource = async(
    partition: string,
    resourceType: string,
    resource: Resource
): Promise<T> => {
    const headers = getAuthHeaders();
    const res = await fetch(`${import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT}${partition}/${resourceType}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(resource),
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Create failed: ${res.status} ${errorBody}`);
    }

    return await res.json();
}



const updateResource = async (
    partition: string,
    resourceType: string,
    id: string,
    resource: Resource
): Promise<T> => {
    const headers = getAuthHeaders();
    const res = await fetch(`${import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT}${partition}/${resourceType}/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(resource),
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Update failed: ${res.status} ${errorBody}`);
    }

    return await res.json();
}

const deleteResource =  async(
    partition: string,
    resourceType: string,
    id: string
): Promise<void> => {
    const headers = getAuthHeaders();
    const res = await fetch(`${import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT}${partition}/${resourceType}/${id}`, {
        method: 'DELETE',
        headers
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Delete failed: ${res.status} ${errorBody}`);
    }
}
  

// Explicitly export searchResource, readResource, and executeOperation
export { executeEverything, 
    executeEverythingAcrossPartitions, 
    executeOperation, 
    readBundleUrl, 
    readResource, 
    searchAcrossPartitions, 
    searchResource, 
    createResource, 
    updateResource, 
    deleteResource };

