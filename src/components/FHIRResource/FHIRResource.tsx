// fhir-renderer.tsx (patched)
import { StructureDefinition } from 'fhir/r4';
import _get from 'lodash/get';
import React, { useEffect, useState } from 'react';
import { ElementDefinition, FHIRResourceProps, StructureDefinitionMap } from '../../types';
import { formatLabel, Loader, loadExtensionStructureDefinition, renderElement, resolveDefinitionUrl } from '../../utils';
import { shouldSuppressField } from '../SuppressionConfig/SupressionConfig';

/**
 * Component for rendering a FHIR resource with its structure definition
 * @param props - Component props
 * @returns React component
 */
const FHIRResource: React.FC<FHIRResourceProps> = ({ resource, followReferences }) => {
    const [structureDefs, setStructureDefs] = useState<StructureDefinitionMap>({});
    const [mainStructureDef, setMainStructureDef] = useState<StructureDefinition | null>(null);
    const [suppressedFields, setSuppressedFields] = useState<Record<string, boolean>>({});
    const resourceType = resource.resourceType;

    // TODO: NEED Merge with line 51
    useEffect(() => {
        const fetchStructureDefs = async () => {
            try {
                const baseProfile = `/us-core/StructureDefinition-us-core-${resourceType.toLowerCase()}.json`;
                const coreTypes = '/r4b/profiles-types.json';

                const [mainDef, typesDef] = await Promise.all([
                    fetch(baseProfile).then((res) => res.json()),
                    fetch(coreTypes).then((res) => res.json())
                ]);

                const typeMap: StructureDefinitionMap = {};
                (typesDef.entry || []).forEach((entry: { resource?: StructureDefinition }) => {
                    if (entry.resource?.resourceType === 'StructureDefinition') {
                        typeMap[entry.resource.url] = entry.resource;
                    }
                });

                typeMap[mainDef.url] = mainDef;
                setStructureDefs(typeMap);
                setMainStructureDef(mainDef);
            } catch (err) {
                console.error('Failed to fetch structure definitions:', err);
            }
        };

        fetchStructureDefs();
    }, [resourceType]);

    useEffect(() => {
        if (!mainStructureDef) return;

        // Get top-level elements and check for suppressions
        const topLevelElements = mainStructureDef.snapshot?.element
            .filter((el: ElementDefinition) =>
                el.path === resourceType ||
                (el.path.startsWith(`${resourceType}.`) && !el.path.slice(resourceType.length + 1).includes('.'))
            ) || [];

        const checkSuppressions = async () => {
            const suppressed: Record<string, boolean> = {};

            for (const el of topLevelElements) {
                const path = el.path.split('.').slice(1).join('.');
                suppressed[path] = await shouldSuppressField(path, resourceType, 'details');
            }

            setSuppressedFields(suppressed);
        };

        checkSuppressions();
    }, [mainStructureDef, resourceType]);

    if (!mainStructureDef) return <Loader />;

    // Get top-level elements from the structure definition
    const topLevelElements = [
        ...new Map(
            mainStructureDef.snapshot?.element
                .filter((el: ElementDefinition) =>
                    el.path === resourceType ||
                    (el.path.startsWith(`${resourceType}.`) && !el.path.slice(resourceType.length + 1).includes('.'))
                )
                .map((el: ElementDefinition) => [el.path, el])
        ).values()
    ];

    return (
         <div className="w-full overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
                <tbody>
                    {topLevelElements.map((el: ElementDefinition, idx: number) => {
                        const path = el.path.split('.').slice(1).join('.');
                        const relativePath = path.startsWith(`${resourceType}.`) ? path.replace(`${resourceType}.`, '') : path;
                        const value = _get(resource, relativePath);
                        const typeUrl = el.type?.[0]?.profile?.[0] || el.type?.[0]?.code;

                        if (suppressedFields[path]) return null;
                        if (value === undefined) return null;

                        return (
                            path === 'subject' || path === 'encounter' ? null : (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="p-2">
                                        <div className="text-sm font-medium text-gray-900">{formatLabel(path)}</div>
                                    </td>
                                    <td className="p-2">
                                        {renderElement({
                                            path: relativePath,
                                            value,
                                            defUrl: typeUrl,
                                            structureDefs,
                                            onLoadExtensionDef: (url) => loadExtensionStructureDefinition(url, structureDefs, setStructureDefs),
                                            resolveDefinitionUrl: (type) => resolveDefinitionUrl(type, structureDefs),
                                            followReferences
                                        })}
                                    </td>
                                </tr>
                            )
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default FHIRResource;
