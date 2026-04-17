import { Resource } from 'fhir/r4';

export interface CCDABundle {
    resourceType: 'Bundle';
    type: 'collection';
    entry: CCDABundleEntry[];
}

export interface CCDABundleEntry {
    resource: Resource;
}

export interface CCDAProcessingResult {
    bundles: Record<string, CCDABundle>;
    composition: Resource;
}
