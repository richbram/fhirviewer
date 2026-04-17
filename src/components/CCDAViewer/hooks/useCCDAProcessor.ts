import { Resource } from 'fhir/r4';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DOMParser as XmlDomParser } from 'xmldom';
import { CCDAProcessingResult, ElementDefinition, MappingDefinition } from '../../../types';
import {
    buildComposition,
    extractCCDASections,
    extractDocumentDate,
    extractDocumentTitle,
    extractDocumentType,
    extractValueFromElement,
    setNestedProperty
} from '../../../utils';

// Extend ElementDefinition to include mapping property
interface CDAElementDefinition extends ElementDefinition {
    mapping?: MappingDefinition[];
}

interface UseCCDAProcessorResult {
    result: CCDAProcessingResult | null;
    loading: boolean;
    error: string | null;
}

export const useCCDAProcessor = (ccdaXml: string, documentType: string): UseCCDAProcessorResult => {
    const [result, setResult] = useState<CCDAProcessingResult | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const processCCDA = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load the structure definition for the document type
                const sd = await fetch(`/ccda/StructureDefinition-${documentType}.json`).then((res) => res.json());

                // Parse the CCDA XML
                const ccdaDom = new XmlDomParser().parseFromString(ccdaXml, 'text/xml');

                // Get the structure definition elements
                const snapshot = sd.snapshot?.element || [];

                // Extract all sections from the CCDA document
                const sectionInfo = extractCCDASections(ccdaDom);

                // Store all created resources
                const resources: Record<string, Resource[]> = {};

                // Group structure definition elements by resource type
                const grouped = snapshot.reduce(
                    (map: Record<string, CDAElementDefinition[]>, el: CDAElementDefinition) => {
                        const [resourceType] = el.path.split('.');
                        if (!map[resourceType]) map[resourceType] = [];
                        map[resourceType].push(el);
                        return map;
                    },
                    {} as Record<string, CDAElementDefinition[]>
                );

                // Process each resource type
                for (const [resourceType, elements] of Object.entries(grouped) as [string, CDAElementDefinition[]][]) {
                    // Check if there are any elements with CDA mappings
                    const elementsWithMapping = elements.filter((e) => e.mapping?.some((m) => m.identity === 'cda'));

                    if (elementsWithMapping.length === 0) {
                        // Special case for Composition
                        if (resourceType === 'Composition') {
                            // Create a Composition resource
                            const compositionResource = {
                                resourceType: 'Composition',
                                id: uuidv4(),
                                status: 'final',
                                type: {
                                    coding: [{ system: 'http://loinc.org', code: '34133-9', display: 'Summarization of Episode Note' }]
                                },
                                title: extractDocumentTitle(ccdaDom) || 'Converted CCDA Document',
                                date: new Date().toISOString()
                            };

                            // Try to extract metadata
                            const docTitle = extractDocumentTitle(ccdaDom);
                            const docType = extractDocumentType(ccdaDom);
                            const docDate = extractDocumentDate(ccdaDom);

                            if (docTitle) setNestedProperty(compositionResource, 'title', docTitle);
                            if (docType) setNestedProperty(compositionResource, 'type.coding.0.display', docType);
                            if (docDate) setNestedProperty(compositionResource, 'date', docDate);

                            if (!resources[resourceType]) resources[resourceType] = [];
                            resources[resourceType].push(compositionResource);
                        }

                        continue;
                    }

                    // Look for root mapping that defines where in the CCDA document to find this resource
                    const rootMapOptions = elements.filter((e: CDAElementDefinition) =>
                        e.mapping?.some(
                            (m: MappingDefinition) =>
                                m.identity === 'cda' && (m.map.includes('component/section') || m.map.includes('ClinicalDocument'))
                        )
                    );

                    if (rootMapOptions.length === 0) {
                        console.warn(`No mapping with 'component/section' found for ${resourceType}`);
                        continue;
                    }

                    const rootMap = rootMapOptions[0];
                    const rootXPath = rootMap?.mapping?.find((m) => m.identity === 'cda')?.map;

                    if (!rootXPath) {
                        console.warn(`No root XPath found for ${resourceType}`);
                        continue;
                    }

                    // Get section elements from the document
                    const sections = ccdaDom.getElementsByTagName('section');
                    const sectionElements: Element[] = [];
                    for (let i = 0; i < sections.length; i++) {
                        sectionElements.push(sections[i] as Element);
                    }

                    // Process each section
                    for (let i = 0; i < sectionElements.length; i++) {
                        const sectionElement = sectionElements[i];

                        // Create the resource
                        const resource: Resource = {
                            resourceType,
                            id: uuidv4()
                        };

                        // Add section title and code if available
                        if (i < sectionInfo.length) {
                            (resource as any).title = sectionInfo[i].title;

                            // Add section text content if available
                            if (sectionInfo[i].text) {
                                (resource as any).text = {
                                    status: 'generated',
                                    div: sectionInfo[i].text
                                };
                            }

                            if (sectionInfo[i].code) {
                                (resource as any).code = {
                                    coding: [
                                        {
                                            system: 'http://loinc.org',
                                            code: sectionInfo[i].code,
                                            display: sectionInfo[i].displayName
                                        }
                                    ]
                                };
                            }
                        }

                        // Process each element that has a CDA mapping
                        for (const el of elements) {
                            const path = el.path.split('.').slice(1).join('.');
                            const xpath = el.mapping?.find((m) => m.identity === 'cda')?.map;
                            if (!xpath) continue;

                            // Extract the value
                            try {
                                const cleanedXPath = xpath.replace(/\[[^\]]+\]/g, '');
                                const value = extractValueFromElement(sectionElement, cleanedXPath);

                                if (value == null || value === '') {
                                    if (path === 'code.text' || path === 'code.coding.0.display') {
                                        // Use title as fallback
                                        const titleElements = sectionElement.getElementsByTagName('title');
                                        const fallback =
                                            titleElements.length > 0
                                                ? titleElements[0].textContent || 'Untitled Section'
                                                : 'Untitled Section';
                                        setNestedProperty(resource, path, fallback);
                                    }
                                    continue;
                                }

                                setNestedProperty(resource, path, value);
                            } catch (err) {
                                console.warn(`Error extracting value for ${path}: ${xpath}`, err);
                            }
                        }

                        if (!resources[resourceType]) resources[resourceType] = [];
                        resources[resourceType].push(resource);
                    }
                }

                // Create bundles for each resource type
                const bundles: Record<string, any> = {};
                for (const [type, entries] of Object.entries(resources)) {
                    bundles[type] = {
                        resourceType: 'Bundle',
                        type: 'collection',
                        entry: entries.map((r) => ({ resource: r }))
                    };
                }

                // Build the composition resource that ties everything together
                const composition = buildComposition(resources);

                // Set the result
                setResult({ bundles, composition });
            } catch (err) {
                console.error('Error processing CCDA:', err);
                setError('Failed to process CCDA document. See console for details.');
            } finally {
                setLoading(false);
            }
        };

        if (ccdaXml && documentType) {
            processCCDA();
        } else {
            setError('CCDA XML or document type is missing');
            setLoading(false);
        }
    }, [ccdaXml, documentType]);

    return { result, loading, error };
};
