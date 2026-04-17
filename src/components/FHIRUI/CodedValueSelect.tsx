import React, { useEffect, useState } from 'react';
import TerminologyLookupSelect from './TerminologyLookupSelect';

interface CodedValueSelectProps {
    resourceType: string;
    path: string;
    value: string;
    onChange: (value: string) => void;
}

const CodedValueSelect: React.FC<CodedValueSelectProps> = ({
    resourceType,
    path,
    value,
    onChange
}) => {
    const [options, setOptions] = useState<{ code: string; display?: string }[]>([]);
    // console.log('Component props:', path, value, resourceType)
    useEffect(() => {
        const loadValueSetFromBinding = async () => {
            try {
                const igRes = await fetch('/config/igs.json');
                const igBundle = await igRes.json();
                const igIds: string[] = igBundle.entry?.map((e: any) => e.resource?.id) ?? [];
                const basePath = import.meta.env.VITE_FHIR_BASE_IG_PATH || '/public/r4b';
                const searchDirs = [...igIds.map(id => `/public/${id}`), basePath];
                const structureDefs = import.meta.glob('/public/**/StructureDefinition-*.json', {
                    as: 'json',
                    eager: true
                });

                let foundBindingUrl: string | undefined;

                for (const [pathKey, file] of Object.entries(structureDefs)) {
                    const def = file as any;
                    if (
                        def.resourceType === 'StructureDefinition' &&
                        def.type === resourceType &&
                        searchDirs.some(dir => pathKey.startsWith(dir))
                    ) {
                        const elements = def.snapshot?.element || [];
                        const el = elements.find((e: any) => e.path === path);
                        if (el?.binding?.valueSet) {
                            foundBindingUrl = el.binding.valueSet;
                            break;
                        }
                    }
                }

                if (!foundBindingUrl) {
                    console.log("No binding URL found for", path);
                    return;
                }

                const baseBindingUrl = stripVersionFromUrl(foundBindingUrl);
                const valueSets = import.meta.glob('/public/**/ValueSet-*.json', {
                    as: 'json',
                    eager: true
                });
                const fhirValueSetsFile = import.meta.glob('/public/r4b/valuesets.json', {
                    as: 'json',
                    eager: true
                });
                const v3CodeSystems = import.meta.glob('/public/r4b/v3-codesystems.json', {
                    as: 'json',
                    eager: true
                });


                const individualValueSets = Object.values(valueSets);
                const fhirValueSets = Object.values(fhirValueSetsFile)
                    .flatMap((file: any) => file.entry?.map((e: any) => e.resource) || []);
                const allValueSets = [...individualValueSets, ...fhirValueSets,];
                const codeSyestemFromValueSet = allValueSets.flatMap(extractConcepts);
                const groupedConcepts = groupConceptsBySource(allValueSets);
                const flatMapV3CodeSystem = Object.values(v3CodeSystems)
                    .flatMap((file: any) => file.entry?.map((e: any) => e.resource) || []);
                const allCodeSystems = [...codeSyestemFromValueSet, ...flatMapV3CodeSystem];

                let matchFound = false;



                for (const [vsPath, file] of Object.entries(allValueSets)) {
                    const vs = file as any;

                    if (vs.resourceType !== 'ValueSet') continue;

                    const vsUrl = vs.url;
                    const baseVsUrl = stripVersionFromUrl(vsUrl);
                    //console.log(vs.url)

                    if (
                        vs.url === foundBindingUrl ||
                        vs.id === foundBindingUrl ||
                        baseVsUrl === baseBindingUrl ||
                        vs.id === baseBindingUrl
                    ) {
                        matchFound = true;

                        let concepts: any[] = [];

                        if (vs.compose?.include) {
                            for (const include of vs.compose.include) {
                                const systemUrl = include.system;
                                const systemConcepts = groupedConcepts[systemUrl];
                                console.log(systemUrl)
                                if (systemConcepts) {
                                    concepts.push(...systemConcepts);
                                } else if (include.concept?.length > 0) {
                                    concepts.push(...include.concept);
                                } else if (systemUrl) {

                                    const matchingCodeSystem = allCodeSystems.find(
                                        (cs: any) =>
                                            stripVersionFromUrl(cs.url) === stripVersionFromUrl(systemUrl)
                                    );
                                    if (matchingCodeSystem?.concept?.length > 0) {
                                        matchFound = true;
                                        concepts.push(...matchingCodeSystem.concept);
                                        console.log('------------found some concept', matchingCodeSystem.concept)
                                    } else {

                                        const systems = vs.compose?.include.map((i: any) => i.system).filter(Boolean);
                                        return (
                                            <TerminologyLookupSelect
                                                systems={systems}
                                                value={value}
                                                onChange={(code) => onChange(code)}
                                            />
                                        );

                                        console.warn(`No concepts found for CodeSystem: ${systemUrl}`);
                                    }
                                }
                            }
                        }


                        const mappedOptions = concepts.map((c: any) => ({
                            code: c.code,
                            display: c.display
                        }));

                        setOptions(mappedOptions);
                        break;
                    }
                }

                if (!matchFound) {
                    console.warn("no matches found!")
                }
            } catch (err) {
                console.error('Failed to load ValueSet:', err);
            }
        };

        loadValueSetFromBinding();
    }, [resourceType, path]);

    return (
        <div>
             <div className="relative">
                <select
                    className="w-full px-4 py-4 text-lg font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-pointer appearance-none"
                    value={value}
                    onInput={(e) => onChange((e.target as HTMLSelectElement).value)}
                >
                    <option value=""></option>
                    {options.map((opt, idx) => (
                        <option
                            key={`${opt.code}-${idx}`}
                            value={opt.code}
                            className={`px-4 py-4 text-lg ${
                                value === opt.code ? 'bg-[#fff4ea] font-bold text-[#093452]' : 'bg-white font-normal'
                            }`}
                        >
                            {opt.display || opt.code}
                        </option>
                    ))}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-b-2 border-r-2 border-gray-700 transform rotate-45" aria-hidden="true"></span>
            </div>
        </div>
    );
};

function stripVersionFromUrl(url: string): string {
    if (!url) return url;
    const versionSeparatorIndex = url.lastIndexOf('|');
    return versionSeparatorIndex > 0 ? url.substring(0, versionSeparatorIndex) : url;
}

function extractConcepts(resource: any): any[] {
    if (resource.resourceType === 'CodeSystem') {
        return resource.concept ?? [];
    } else if (resource.resourceType === 'ValueSet') {
        return resource.compose?.include?.flatMap((inc: any) => inc.concept || []) ?? [];
    }
    return [];
}

function groupConceptsBySource(resources: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const resource of resources) {
        let key: string | undefined;
        let concepts: any[] = [];

        if (resource.resourceType === 'CodeSystem') {
            key = resource.url;
            concepts = resource.concept ?? [];
        } else if (resource.resourceType === 'ValueSet') {
            key = resource.url;
            concepts = resource.compose?.include?.flatMap((inc: any) => inc.concept || []) ?? [];
        }

        if (key) {
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(...concepts);
        }
    }

    return grouped;
}

export default CodedValueSelect;
