import { Resource, StructureDefinition } from 'fhir/r4';
import _get from 'lodash/get';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BundleEntry, Column, FHIRSearchResultsProps, StructureDefinitionMap } from '../../types';
import { formatLabel, loadExtensionStructureDefinition, NoResults, renderElement, resolveDefinitionUrl } from '../../utils';
import { shouldSuppressField } from '../SuppressionConfig/SupressionConfig';
import { loadStructureDefinitionsFromProfiles } from '../../utils/structuredDefinitionHelper';
/**
 * Component for displaying FHIR search results in a table format
 * @param props - Component props
 * @returns React component
 */
const FHIRSearchResults: React.FC<FHIRSearchResultsProps> = ({ bundle, onSelectResource, followReferences }) => {
    const [structureDefs, setStructureDefs] = useState<StructureDefinitionMap>({});
    const [mainStructureDef, setMainStructureDef] = useState<StructureDefinition | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const entries = (bundle.entry?.map((e: BundleEntry) => e.resource).filter((r: Resource | undefined): r is Resource => r !== undefined) || []);
    const resourceType = entries[0]?.resourceType;
    const location = useLocation();

    useEffect(() => {
        const fetchStructureDefs = async () => {
            if (!resourceType) return;

            try {

                const profiles: string[] = (entries[0]?.resource?.meta?.profile) || [];
                console.log(entries)
                const def = await loadStructureDefinitionsFromProfiles(profiles, resourceType, [
                    '/us-core',
                    '/carin-bb'
                ], '/r4b');

                console.log(def)
                if (!def) {
                    console.warn(`No StructureDefinition found for resourceType ${resourceType}`);
                    return;
                }

                if (def) {
                    const typesDefRes = await fetch('/r4b/profiles-types.json');
                    const typesDef = await typesDefRes.json();
                    const typeMap: StructureDefinition = {
                        resourceType: 'StructureDefinition',
                        abstract: false,
                        kind: 'resource',
                        name: '',
                        status: 'active',
                        type: '',
                        url: ''
                    };

                    (typesDef.entry || []).forEach((entry: any) => {
                        if (entry.resource?.resourceType === 'StructureDefinition') {
                            const d: StructureDefinition = entry.resource;
                            typeMap[d.url] = d;
                        }
                    });

                    typeMap[def.fullUrl] = def;
                    setStructureDefs(typeMap);
                    setMainStructureDef(def);
                }

                // Extract and process columns from structure definition
                const paths = (def.snapshot?.element || []).filter(
                    (el: { path: string }) =>
                        typeof el.path === 'string' && (el.path === resourceType || el.path.startsWith(`${resourceType}.`))
                );

                const uniquePathMap = new Map<string, (typeof paths)[0]>();

                paths.forEach((el: { path: string }) => {
                    if (typeof el.path === 'string' && !el.path.slice(resourceType.length + 1).includes('.')) {
                        uniquePathMap.set(el.path, el);
                    }
                });

                const dedupedElements = Array.from(uniquePathMap.values());

                const dedupedColumns = dedupedElements.map((el: any) => {
                    const relativePath = el.path.replace(`${resourceType}.`, '');
                    const typeUrl = el.type?.[0]?.profile?.[0] || el.type?.[0]?.code;

                    if (el.path.includes('extension')) {
                        const extensionTitle = el.short || el.path.split('.').pop();
                        return {
                            path: relativePath,
                            label: extensionTitle,
                            defUrl: typeUrl
                        };
                    }

                    return {
                        path: relativePath,
                        label: relativePath,
                        defUrl: typeUrl
                    };
                });

                const filterColumnsWithData = async () => {
                    const filtered = await Promise.all(
                        dedupedColumns.map(async (col) => {
                            const suppressed = await shouldSuppressField(col.path, resourceType, 'searchResults');
                            if (suppressed) return null;

                            if (location.pathname.includes('Patient') && col.path === 'subject') {
                                return null;
                            }

                            const hasData = entries.some((resource: Resource) => {
                                const val = _get(resource, col.path);
                                return (
                                    val !== undefined &&
                                    val !== null &&
                                    !(Array.isArray(val) && val.length === 0) &&
                                    !(typeof val === 'object' && Object.keys(val).length === 0)
                                );
                            });

                            return hasData ? col : null;
                        })
                    );

                    return filtered.filter((c): c is NonNullable<typeof c> => c !== null);
                };

                const columnsWithData = await filterColumnsWithData();
                setColumns(columnsWithData);
            } catch (err) {
                console.error('Failed to fetch structure definitions:', err);
            }
        };

        if (resourceType) {
            fetchStructureDefs();
        }
    }, [resourceType]);

    if (!mainStructureDef) return <NoResults />;

    const resources: Resource[] = (bundle.entry ?? [])
        .map(({ resource }: BundleEntry): Resource | undefined => resource)
        .filter((res): res is Resource => res !== undefined);

    return (
        <container
            alignment="center"
            gutters="default"
            inherit="false"
            content-width="fluid"
            padding-bottom="sm"
        >
            <basic-table header-fill zebra divider="horizontal" cell-padding="tight" width="100%" height="100%">
                <table>
                    <thead>
                        <tr>
                            {columns.map((col: Column, idx: number) => (
                                <th scope='col' key={idx}>
                                    <typography>{formatLabel(col.label)}</lh-typography>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {resources.map((resource: Resource, rowIdx: number) => (
                            <tr
                                key={rowIdx}
                                onClick={() => onSelectResource?.(resource)}
                            >
                                {columns.map((col: Column, colIdx: number) => (
                                    <td key={colIdx}>
                                        {renderElement({
                                            path: col.path,
                                            value: _get(resource, col.path),
                                            defUrl: col.defUrl,
                                            structureDefs,
                                            onLoadExtensionDef: (url) => loadExtensionStructureDefinition(url, structureDefs, setStructureDefs),
                                            resolveDefinitionUrl: (type) => resolveDefinitionUrl(type, structureDefs),
                                            followReferences
                                        })}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </lh-basic-table>
        </lh-container>
    );
};

export default FHIRSearchResults;
