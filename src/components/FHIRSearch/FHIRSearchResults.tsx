import { Resource, StructureDefinition } from 'fhir/r4';
import _get from 'lodash/get';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BundleEntry, Column, FHIRSearchResultsProps, StructureDefinitionMap } from '../../types';
import { NoResults, formatLabel, loadExtensionStructureDefinition, renderElement, resolveDefinitionUrl } from '../../utils';
import { shouldSuppressField } from '../SuppressionConfig/SupressionConfig';
import { loadStructureDefinitionsFromProfiles } from '../../utils/structuredDefinitionHelper';

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
                const profiles: string[] = (entries[0] as any)?.meta?.profile || [];
                const def = await loadStructureDefinitionsFromProfiles(profiles, resourceType, ['/us-core', '/carin-bb'], '/r4b');

                if (!def) {
                    console.warn(`No StructureDefinition found for resourceType ${resourceType}`);
                    return;
                }

                const typesDefRes = await fetch('/r4b/profiles-types.json');
                const typesDef = await typesDefRes.json();
                const typeMap: StructureDefinitionMap = {};

                (typesDef.entry || []).forEach((entry: any) => {
                    if (entry.resource?.resourceType === 'StructureDefinition') {
                        const d: StructureDefinition = entry.resource;
                        typeMap[d.url] = d;
                    }
                });

                typeMap[(def as any).fullUrl || def.url] = def;
                setStructureDefs(typeMap);
                setMainStructureDef(def);

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

                setColumns(filtered.filter((c): c is NonNullable<typeof c> => c !== null));
            } catch (err) {
                console.error('Failed to fetch structure definitions:', err);
            }
        };

        if (resourceType) {
            fetchStructureDefs();
        }
    }, [resourceType, location.pathname]);

    if (!mainStructureDef) return <NoResults />;

    const resources: Resource[] = (bundle.entry ?? [])
        .map(({ resource }: BundleEntry): Resource | undefined => resource)
        .filter((res): res is Resource => res !== undefined);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {columns.map((col: Column, idx: number) => (
                                <th
                                    scope="col"
                                    key={idx}
                                    className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600"
                                >
                                    {formatLabel(col.label)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {resources.map((resource: Resource, rowIdx: number) => (
                            <tr
                                key={rowIdx}
                                onClick={() => onSelectResource?.(resource)}
                                className="cursor-pointer transition hover:bg-slate-50"
                            >
                                {columns.map((col: Column, colIdx: number) => (
                                    <td key={colIdx} className="px-4 py-3 align-top text-slate-700">
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
            </div>
        </div>
    );
};

export default FHIRSearchResults;
