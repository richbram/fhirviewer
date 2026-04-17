export type AuthMode = 'msal' | 'none' | 'gcp';

const readString = (...values: Array<string | undefined>): string => {
    const first = values.find((value) => typeof value === 'string' && value.trim().length > 0);
    return first?.trim() ?? '';
};

const parseList = (value: string): string[] => {
    if (!value) {
        return [];
    }

    const splitter = value.includes(',')
        ? /,/g
        : value.includes(' ')
            ? /\s+/g
            : /\./g;

    return value
        .split(splitter)
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const parseBoolean = (value: string, fallback: boolean): boolean => {
    if (!value) {
        return fallback;
    }

    return value.toLowerCase() === 'true';
};

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');
const trimTrailingSlash = (value: string): string => value.replace(/\/+$/g, '');

const normalizeAuthMode = (value: string): AuthMode => {
    const normalized = value.toLowerCase();

    if (normalized === 'none' || normalized === 'gcp') {
        return normalized;
    }

    return 'msal';
};

export const authMode: AuthMode = normalizeAuthMode(
    readString(import.meta.env.VITE_AUTH_MODE, import.meta.env.VITE_APP_AUTH_MODE, 'msal')
);

export const fhirEndpoint = trimTrailingSlash(
    readString(
        import.meta.env.VITE_FHIR_BASE_URL,
        import.meta.env.VITE_APP_BCNC_FHIR_ENDPOINT,
        import.meta.env.VITE_BCNC_FHIR_ENDPOINT
    )
);

export const defaultPartitionId = readString(
    import.meta.env.VITE_FHIR_PARTITION_ID,
    import.meta.env.VITE_APP_BCNC_PARTITION_ID,
    import.meta.env.VITE_BCNC_PARTITION_ID,
    'nchie'
);

export const configuredPartitions = parseList(
    readString(
        import.meta.env.VITE_FHIR_PARTITIONS_LIST,
        import.meta.env.VITE_APP_BCNC_PARTITIONS_LIST,
        import.meta.env.VITE_BCNC_PARTITIONS_LIST,
        defaultPartitionId
    )
);

export const usePartitions = parseBoolean(
    readString(import.meta.env.VITE_FHIR_USE_PARTITIONS),
    configuredPartitions.length > 0
);

export const partitionResourceMapUrl = readString(
    import.meta.env.VITE_FHIR_PARTITION_MAP_URL,
    '/config/partition-resource-map.json'
);

export const defaultSearchCount = Number(
    readString(import.meta.env.VITE_FHIR_SEARCH_COUNT, '50')
);

export const msalClientId = readString(
    import.meta.env.VITE_APP_BCNC_CLIENT_ID,
    import.meta.env.VITE_BCNC_CLIENT_ID
);

export const msalAuthorityBase = readString(
    import.meta.env.VITE_APP_BCNC_AUTHORITY,
    import.meta.env.VITE_BCNC_AUTHORITY
);

export const msalTenantId = readString(
    import.meta.env.VITE_APP_BCNC_TENANT_ID,
    import.meta.env.VITE_BCNC_TENANT_ID
);

export const msalScope = readString(
    import.meta.env.VITE_APP_BCNC_SCOPE,
    import.meta.env.VITE_BCNC_SCOPE
);

export const redirectUri = window.location.origin;
export const postLogoutRedirectUri = window.location.origin;

export const gcpClientId = readString(import.meta.env.VITE_GCP_CLIENT_ID);
export const gcpScopes = readString(
    import.meta.env.VITE_GCP_SCOPES,
    'https://www.googleapis.com/auth/cloud-platform'
)
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

export const buildFhirUrl = (resourcePath: string, partition?: string): string => {
    const segments = [fhirEndpoint];

    if (usePartitions) {
        const effectivePartition = partition || defaultPartitionId;
        if (effectivePartition) {
            segments.push(trimSlashes(effectivePartition));
        }
    }

    segments.push(trimSlashes(resourcePath));

    return segments
        .filter(Boolean)
        .map((segment, index) => index === 0 ? trimTrailingSlash(segment) : trimSlashes(segment))
        .join('/');
};

export const getAvailablePartitions = (): string[] => {
    if (!usePartitions) {
        return [];
    }

    return configuredPartitions.length > 0
        ? configuredPartitions
        : (defaultPartitionId ? [defaultPartitionId] : []);
};
