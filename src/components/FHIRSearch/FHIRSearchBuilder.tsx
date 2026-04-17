import React, { JSX, useEffect, useState } from 'react';
import { SearchParam } from '../../providers/FHIRClient';
import { extensionHasBoundValueSet, hasBoundValueSet } from '../../utils/structuredDefinitionHelper';
import CodedValueSelect from '../FHIRUI/CodedValueSelect';
import ExtensionSearchInput from '../FHIRUI/ExtensionSearch';
import MemberIdSearch from '../FHIRUI/MemberIdSearch';
import RangeInput from '../FHIRUI/RangeInput';
import ReferenceSelect from '../FHIRUI/ReferenceSelect';

const typeMap: Record<string, (name: string, value: string, onChange: (v: string) => void) => JSX.Element> = {
    base64Binary: (n, v, onChange) => <input type='file' name={n} onInput={(e) => onChange(e.target.value)} />,
    boolean: (n, v, onChange) => (
        <select name={n} value={v} onInput={(e) => onChange(e.target.value)}>
            <option vaimportlue=''>--</lh-option>
            <option value='true'>true</lh-option>
            <option value='false'>false</lh-option>
        </lh-select>
    ),
    canonical: (n, v, onChange) => <input type='url' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    code: (n, v, onChange) => <input type='text' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    date: (n, v, onChange) => <input type='date' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    dateTime: (n, v, onChange) => <input type='datetime-local' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    decimal: (n, v, onChange) => <input type='number' step='any' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    id: (n, v, onChange) => <input type='text' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    instant: (n, v, onChange) => <input type='datetime-local' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    integer: (n, v, onChange) => <input type='number' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    integer64: (n, v, onChange) => <input type='number' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    markdown: (n, v, onChange) => <textarea name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    oid: (n, v, onChange) => <input type='text' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    positiveInt: (n, v, onChange) => <input type='number' min='1' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    string: (n, v, onChange) => <input type='text' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    time: (n, v, onChange) => <input type='time' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    unsignedInt: (n, v, onChange) => <input type='number' min='0' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    uri: (n, v, onChange) => <input type='url' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    url: (n, v, onChange) => <input type='url' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    uuid: (n, v, onChange) => <input type='text' name={n} value={v} onInput={(e) => onChange(e.target.value)} />,
    token: (n, v, onChange) => <input type='text' name={n} value={v} onInput={(e) => onChange(e.target.value)} />
};

type Param = {
    code: string;
    type: string;
    description?: string;
    expression?: string;
};

export const FhirSearchBuilder: React.FC<{ resourceType: string; followReferences?: true, onSearch: (params: SearchParam[]) => void }> = ({
    resourceType,
    onSearch
}) => {
    const [params, setParams] = useState<Param[]>([]);
    const [formState, setFormState] = useState<Record<string, string>>({});
    const [excludedParams, setExcludedParams] = useState<string[]>([]);
    const [codedParams, setCodedParams] = useState<Set<string>>(new Set());

    const ucumUnits = [
        { code: 'mg', display: 'milligram' },
        { code: 'kg', display: 'kilogram' },
        { code: 'g', display: 'gram' },
        { code: 'mmHg', display: 'millimeter of mercury' },
        { code: 'cm', display: 'centimeter' },
        { code: 'mL', display: 'milliliter' },
        { code: 'mg/dL', display: 'milligrams per deciliter' },
        { code: '°C', display: 'degree Celsius' },
    ];

    /**
 * Determines the type of input for range-based SearchParameters
 * Returns 'number', 'date', or null
 */
    const getRangeInputType = (param: { type?: string; expression?: string }): 'number' | 'date' | null => {
        const expr = param.expression?.toLowerCase() || '';
        const isPeriod = expr.includes('.period') || param.type === 'date' || param.type === 'dateTime';
        const isRange = expr.includes('range') || expr.includes('quantity') || param.type === 'quantity' || param.type === 'number';

        if (isPeriod) return 'date';
        if (isRange) return 'number';
        return null;
    };

    const getUnitForSearchParam = (
        resourceType: string,
        expression: string
    ): string | null => {
        const allStructureDefs = import.meta.glob('/public/**/StructureDefinition-*.json', {
            as: 'json',
            eager: true,
        });

        const exprPath = expression?.split('|')[0]?.trim(); // e.g., Observation.valueQuantity

        for (const [path, file] of Object.entries(allStructureDefs)) {
            const def = file as any;
            if (def.resourceType !== 'StructureDefinition') continue;
            if (def.type !== resourceType) continue;

            const snapshot = def.snapshot?.element || [];
            const match = snapshot.find((el: any) => el.path === exprPath);

            if (!match) continue;

            // 1. Check for UCUM unit display via extension (rare but allowed)
            const unitExt = match.extension?.find((ext: any) =>
                ext.url?.includes('unit')
            );
            if (unitExt?.valueString) {
                return unitExt.valueString;
            }

            // 2. Check for valueSet binding to UCUM (preferred)
            const valueSet = match.binding?.valueSet;
            if (
                typeof valueSet === 'string' &&
                valueSet.toLowerCase().includes('ucum')
            ) {
                return 'UCUM'; // You could fetch from a UCUM set later
            }

            // 3. Hardcoded fallback for common paths (optional)
            if (exprPath === 'Observation.valueQuantity') return 'mg/dL';
            if (exprPath === 'Observation.bodyTemperature') return '°C';
        }

        return null;
    };

    useEffect(() => {

        const isExtensionType = (param: any): boolean => {
            //console.log(param.expression.includes('extension'))
            return param.expression.includes('extension')
        };



        const determineCodedParams = async () => {
            const igRes = await fetch('/config/igs.json');
            const igBundle = await igRes.json();
            const igDirs = igBundle.entry?.map((e: any) => `/public/${e.resource.id}`) || [];

            const result = new Set<string>();

            await Promise.all(
                params.map(async (param) => {
                    const isToken = param.type === 'token' || param.type === 'code';
                    const expression = param.expression?.split('|')[0].trim();

                    if (!isToken || !expression) return;
                    //console.log(expression)
                    if (isExtensionType(param)) {
                        //console.log(param.expression+ 'this is an extension type!!!!!!!!!!')
                        const match = param.expression.match(/url\s*=\s*'"['"]/);
                        //console.log('blahablah' + match);
                        const extUrl = param.type?.profile?.[0]; // e.g., http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity
                        //console.log(param)
                        //console.log(extUrl)
                        //const extUrl = extractExtensionUrl(expression);
                        if (extUrl && await extensionHasBoundValueSet(extUrl)) {
                            result.add(param.code);
                        }
                    } else if (await hasBoundValueSet(expression, resourceType, igDirs)) {
                        console.log(param.code)
                        result.add(param.code);
                    }
                })
            );
            console.log(result)
            setCodedParams(result);
        };

        determineCodedParams();
    }, [params, resourceType]);



    useEffect(() => {
        const loadConfig = async () => {
            try {
                // Load exclusions
                const exclusionRes = await fetch('/config/search-param-exclusions.json');
                const exclusionData = await exclusionRes.json();
                const globalExclusions = exclusionData.excludedParams.global || [];
                const resourceExclusions = exclusionData.excludedParams[resourceType] || [];
                setExcludedParams([...globalExclusions, ...resourceExclusions]);

                // Load IGs
                const igRes = await fetch('/config/igs.json');
                const igBundle = await igRes.json();
                const igIds: string[] = igBundle.entry
                    ?.map((e: any) => e.resource?.id)
                    .filter(Boolean) ?? [];

                const basePath = import.meta.env.VITE_FHIR_BASE_IG_PATH || '/public/r4b';
                const igDirs = igIds.map(id => `/public/${id}`);

                const relevant: Param[] = [];

                // Load IG-specific SearchParameters
                const igFiles = import.meta.glob('/public/**/SearchParameter-*.json', {
                    as: 'json',
                    eager: true
                });

                for (const [path, file] of Object.entries(igFiles)) {
                    const sp = file as any;
                    if (
                        sp.resourceType === 'SearchParameter' &&
                        sp.base?.includes(resourceType) &&
                        igDirs.some(dir => path.startsWith(dir))
                    ) {
                        relevant.push({
                            code: sp.code,
                            type: sp.type,
                            description: sp.description,
                            expression: sp.expression,
                        });
                    }
                }

                // Load base SearchParameters from r4b bundle
                const baseRes = await fetch(`${basePath}/search-parameters.json`);
                const baseBundle = await baseRes.json();

                const baseSPs: Param[] = baseBundle.entry
                    ?.filter((e: any) =>
                        e.resource?.resourceType === 'SearchParameter' &&
                        e.resource.base?.includes(resourceType)
                    )
                    .map((e: any) => ({
                        code: e.resource.code,
                        type: e.resource.type,
                        description: e.resource.description,
                        expression: e.resource.expression,
                    })) ?? [];

                // Deduplicate by code: IG params win over base
                const combined = [...relevant, ...baseSPs];
                const uniqueByCode = new Map<string, Param>();
                for (const param of combined) {
                    if (!uniqueByCode.has(param.code)) {
                        uniqueByCode.set(param.code, param);
                    }
                }

                // Sort alphabetically by code
                const sortedParams = Array.from(uniqueByCode.values()).sort((a, b) =>
                    a.code.localeCompare(b.code)
                );

                setParams(sortedParams);
                setFormState({});
            } catch (err) {
                console.error('Failed to load search parameters:', err);
            }
        };

        loadConfig();
    }, [resourceType]);




    const handleChange = (code: string, value: string) => {
        setFormState((prev) => ({
            ...prev,
            [code]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();


        const searchParams = Object.entries(formState)
            .filter(([_, v]) => v !== '')
            .map(([name, value]) => ({ name, value }));

        Object.keys(formState).forEach((key) => {
            if (key.endsWith('Min')) {
                const base = key.slice(0, -3);
                const prefix = formState[`${base}PrefixMin`] || 'ge';
                searchParams[base] = searchParams[base] || [];
                (searchParams[base] as string[]).push(`${prefix}${formState[key]}`);
            } else if (key.endsWith('Max')) {
                const base = key.slice(0, -3);
                const prefix = formState[`${base}PrefixMax`] || 'le';
                searchParams[base] = searchParams[base] || [];
                (searchParams[base] as string[]).push(`${prefix}${formState[key]}`);
            } else if (key.endsWith('Unit')) {
                const base = key.slice(0, -4);
                if (formState[key]) {
                    searchParams[`${base}:unit`] = formState[key];
                }
            }
            // Remap patient/subject to custom param
            else if (key === 'patient' || key === 'subject') {
                searchParams['patient.identifier'] = value;
            }

        });
        onSearch(searchParams);
    };

    return (
        <form onSubmit={handleSubmit}>
             <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {params
                        .filter((param) => !excludedParams.includes(param.code))
                        .map((param) => (
                            <div key={param.code} className="space-y-2">
                                <div className="text-sm font-medium text-gray-700">
                                    {param.code}
                                    <span className="ml-2 text-xs text-gray-500 hover:text-gray-700 cursor-help" title={param.description || ''}>
                                        ?
                                    </span>
                                </div>

                                {
                                    codedParams.has(param.code) ? (
                                        <CodedValueSelect
                                            resourceType={resourceType}
                                            path={param.expression.split('|')[0].trim()}
                                            value={formState[param.code] || ''}
                                            onChange={(val) => handleChange(param.code, val)}
                                        />
                                    ) : getRangeInputType(param) ? (
                                        <RangeInput
                                            name={param.code}
                                            type={getRangeInputType(param)}
                                            unit={formState[`${param.code}Unit`] || getUnitForSearchParam(resourceType, param.expression)}
                                            valueMin={formState[`${param.code}Min`] || ''}
                                            valueMax={formState[`${param.code}Max`] || ''}
                                            prefixMin={formState[`${param.code}PrefixMin`] || 'ge'}
                                            prefixMax={formState[`${param.code}PrefixMax`] || 'le'}
                                            onChange={(key, val) => setFormState(prev => ({ ...prev, [key]: val }))}
                                            unitOptions={getRangeInputType(param) === 'number' ? ucumUnits : []}
                                        />
                                    ) : param.expression.includes('extension') ? (
                                        <ExtensionSearchInput
                                            paramCode={param.code}
                                            expression={param.expression || ''}
                                            value={formState[param.code] || []}
                                            onChange={(vals) =>
                                                setFormState((prev) => ({ ...prev, [param.code]: vals }))
                                            }
                                        />
                                    ) : param.type === 'reference' && (param.code === 'patient' || param.code === 'subject') ? (
                                        <MemberIdSearch
                                            value={formState[param.code] || ''}
                                            onChange={(val) => handleChange(param.code, val)}
                                        />
                                    ) : param.type === 'reference' && param.target && param.target.length > 0 ? (
                                        <ReferenceSelect
                                            targetResource={param.target[0]}
                                            value={formState[param.code] || ''}
                                            onChange={(val) => handleChange(param.code, val)}
                                        />
                                    ) : (
                                        (typeMap[param.type] || typeMap['string'])(
                                            param.code,
                                            formState[param.code] || '',
                                            (v) => handleChange(param.code, v)
                                        )
                                    )
                                }
                            </div>
                        ))}
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button 
                    type="submit" 
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                </button>
            </div>
        </form>
    );
};
