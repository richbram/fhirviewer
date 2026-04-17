import { Bundle } from 'fhir/r4';

export const groupBundleByResourceType = (bundle: Bundle): Record<string, Bundle> => {
    if (bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
        throw new Error('Invalid FHIR Bundle');
    }
    const groups: Record<string, Bundle> = {};
    for (const entry of bundle.entry) {
        const resource = entry.resource;
        if (!resource) continue;
        const resourceType = resource.resourceType;
        if (!groups[resourceType]) {
            groups[resourceType] = {
                resourceType: 'Bundle',
                type: 'searchset',
                entry: [],
            };
        }
        groups[resourceType].entry!.push(entry);
    }
    return groups;
};
