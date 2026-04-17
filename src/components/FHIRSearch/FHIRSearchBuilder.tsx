import React, { JSX, useEffect, useState } from 'react';
import { SearchParam } from '../../providers/FHIRClient';
import { extensionHasBoundValueSet, hasBoundValueSet } from '../../utils/structuredDefinitionHelper';
import CodedValueSelect from '../FHIRUI/CodedValueSelect';
import ExtensionSearchInput from '../FHIRUI/ExtensionSearch';
import MemberIdSearch from '../FHIRUI/MemberIdSearch';
import RangeInput from '../FHIRUI/RangeInput';
import ReferenceSelect from '../FHIRUI/ReferenceSelect';

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#e57f25] focus:outline-none focus:ring-2 focus:ring-[#e57f25]/20';
const textAreaClassName = `${inputClassName} min-h-[96px]`;

const typeMap: Record<string, (name: string, value: string, onChange: (v: string) => void) => JSX.Element> = {
    base64Binary: (n, _v, onChange) => (
        <input
            type="file"
            name={n}
            className={inputClassName}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
    boolean: (n, v, onChange) => (
        <select
            name={n}
            value={v}
            className={inputClassName}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">--</option>
            <option value="true">true</option>
            <option value="false">false</option>
        </select>
    ),
    canonical: (n, v, onChange) => <input type="url" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    code: (n, v, onChange) => <input type="text" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    date: (n, v, onChange) => <input type="date" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    dateTime: (n, v, onChange) => <input type="datetime-local" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    decimal: (n, v, onChange) => <input type="number" step="any" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    id: (n, v, onChange) => <input type="text" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    instant: (n, v, onChange) => <input type="datetime-local" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    integer: (n, v, onChange) => <input type="number" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    integer64: (n, v, onChange) => <input type="number" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    markdown: (n, v, onChange) => <textarea name={n} value={v} className={textAreaClassName} onChange={(e) => onChange(e.target.value)} />,
    oid: (n, v, onChange) => <input type="text" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    positiveInt: (n, v, onChange) => <input type="number" min="1" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    string: (n, v, onChange) => <input type="text" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    time: (n, v, onChange) => <input type="time" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    unsignedInt: (n, v, onChange) => <input type="number" min="0" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    uri: (n, v, onChange) => <input type="url" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    url: (n, v, onChange) => <input type="url" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    uuid: (n, v, onChange) => <input type="text" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />,
    token: (n, v, onChange) => <input type="text" name={n} value={v} className={inputClassName} onChange={(e) => onChange(e.target.value)} />
};

type Param = {
    code: string;
    type: string;
    description?: string;
    expression?: string;
    target?: string[];
    profile?: string[];
};

export const FhirSearchBuilder: React.FC<{ resourceType: string; followReferences?: true; onSearch: (params: SearchParam[]) => void }> = ({
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
        { code: '°C', display: 'degree Celsius' }
    ];

    const getRangeInputType = (param: { type?: string; expression?: string }): 'number' | 'date' | null => {
        const expr = param.expression?.toLowerCase() || '';
        const isPeriod = expr.includes('.period') || param.type === 'date' || param.type === 'dateTime';
        const isRange = expr.includes('range') || expr.includes('quantity') || param.type === 'quantity' || param.type === 'number';

        if (isPeriod) return 'date';
        if (isRange) return 'number';
        return null;
    };

    const getUnitForSearchParam = (currentResourceType: string, expression?: string): string | null => {
        const allStructureDefs = import.meta.glob('/public/**/StructureDefinition-*.json', {
            as: 'json',
            eager: true
        });

        const exprPath = expression?.split('|')[0]?.trim();
        if (!exprPath) return null;

        for (const [, file] of Object.entries(allStructureDefs)) {
            const def = file as any;
            if (def.resourceType !== 'StructureDefinition') continue;
            if (def.type !== currentResourceType) continue;

            const snapshot = def.snapshot?.element || [];
            const match = snapshot.find((el: any) => el.path === exprPath);
            if (!match) continue;

            const unitExt = match.extension?.find((ext: any) => ext.url?.includes('unit'));
            if (unitExt?.valueString) {
                return unitExt.valueString;
            }

            const valueSet = match.binding?.valueSet;
            if (typeof valueSet === 'string' && valueSet.toLowerCase().includes('ucum')) {
                return 'UCUM';
            }

            if (exprPath === 'Observation.valueQuantity') return 'mg/dL';
            if (exprPath === 'Observation.bodyTemperature') return '°C';
        }

        return null;
    };

    useEffect(() => {
        const isExtensionType = (param: Param): boolean => Boolean(param.expression?.includes('extension'));

        const determineCodedParams = async () => {
            const result = new Set<string>();

            await Promise.all(
                params.map(async (param) => {
                    const isToken = param.type === 'token' || param.type === 'code';
                    const expression = param.expression?.split('|')[0].trim();

                    if (!isToken || !expression) return;

                    if (isExtensionType(param)) {
                        const extUrl = param.profile?.[0];
                        if (extUrl && await extensionHasBoundValueSet(extUrl)) {
                            result.add(param.code);
                        }
                    } else if (await hasBoundValueSet(expression, resourceType, ['/public/us-core', '/public/carin-bb'])) {
                        result.add(param.code);
                    }
                })
            );

            setCodedParams(result);
        };

        if (params.length > 0) {
            determineCodedParams();
        }
    }, [params, resourceType]);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const exclusionRes = await fetch('/config/search-param-exclusions.json');
                const exclusionData = await exclusionRes.json();
                const globalExclusions = exclusionData.excludedParams.global || [];
                const resourceExclusions = exclusionData.excludedParams[resourceType] || [];
                setExcludedParams([...globalExclusions, ...resourceExclusions]);

                const igRes = await fetch('/config/igs.json');
                const igBundle = await igRes.json();
                const igIds: string[] = igBundle.entry?.map((e: any) => e.resource?.id).filter(Boolean) ?? [];

                const basePath = import.meta.env.VITE_FHIR_BASE_IG_PATH || '/public/r4b';
                const igDirs = igIds.map((id) => `/public/${id}`);
                const relevant: Param[] = [];

                const igFiles = import.meta.glob('/public/**/SearchParameter-*.json', {
                    as: 'json',
                    eager: true
                });

                for (const [path, file] of Object.entries(igFiles)) {
                    const sp = file as any;
                    if (
                        sp.resourceType === 'SearchParameter' &&
                        sp.base?.includes(resourceType) &&
                        igDirs.some((dir) => path.startsWith(dir))
                    ) {
                        relevant.push({
                            code: sp.code,
                            type: sp.type,
                            description: sp.description,
                            expression: sp.expression,
                            target: sp.target,
                            profile: sp.profile
                        });
                    }
                }

                const baseRes = await fetch(`${basePath}/search-parameters.json`);
                const baseBundle = await baseRes.json();

                const baseSPs: Param[] = baseBundle.entry
                    ?.filter((e: any) => e.resource?.resourceType === 'SearchParameter' && e.resource.base?.includes(resourceType))
                    .map((e: any) => ({
                        code: e.resource.code,
                        type: e.resource.type,
                        description: e.resource.description,
                        expression: e.resource.expression,
                        target: e.resource.target,
                        profile: e.resource.profile
                    })) ?? [];

                const combined = [...relevant, ...baseSPs];
                const uniqueByCode = new Map<string, Param>();
                for (const param of combined) {
                    if (!uniqueByCode.has(param.code)) {
                        uniqueByCode.set(param.code, param);
                    }
                }

                const sortedParams = Array.from(uniqueByCode.values()).sort((a, b) => a.code.localeCompare(b.code));
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

        const builtSearchParams: SearchParam[] = [];

        Object.entries(formState).forEach(([key, value]) => {
            if (value === '') return;

            if (key.endsWith('Min')) {
                const base = key.slice(0, -3);
                const prefix = formState[`${base}PrefixMin`] || 'ge';
                builtSearchParams.push({ name: base, value: `${prefix}${value}` });
                return;
            }

            if (key.endsWith('Max')) {
                const base = key.slice(0, -3);
                const prefix = formState[`${base}PrefixMax`] || 'le';
                builtSearchParams.push({ name: base, value: `${prefix}${value}` });
                return;
            }

            if (key.endsWith('Unit')) {
                const base = key.slice(0, -4);
                builtSearchParams.push({ name: `${base}:unit`, value });
                return;
            }

            if (key.endsWith('PrefixMin') || key.endsWith('PrefixMax')) {
                return;
            }

            if (key === 'patient' || key === 'subject') {
                builtSearchParams.push({ name: 'patient.identifier', value });
                return;
            }

            builtSearchParams.push({ name: key, value });
        });

        onSearch(builtSearchParams);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {params
                    .filter((param) => !excludedParams.includes(param.code))
                    .map((param) => (
                        <div key={param.code} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <label className="block text-sm font-medium text-slate-800">
                                <span>{param.code}</span>
                                {param.description && (
                                    <span className="ml-2 cursor-help text-xs font-normal text-slate-500" title={param.description}>
                                        {param.description}
                                    </span>
                                )}
                            </label>

                            {codedParams.has(param.code) ? (
                                <CodedValueSelect
                                    resourceType={resourceType}
                                    path={param.expression?.split('|')[0].trim() || ''}
                                    value={formState[param.code] || ''}
                                    onChange={(val) => handleChange(param.code, val)}
                                />
                            ) : getRangeInputType(param) ? (
                                <RangeInput
                                    name={param.code}
                                    type={getRangeInputType(param)!}
                                    unit={formState[`${param.code}Unit`] || getUnitForSearchParam(resourceType, param.expression) || ''}
                                    valueMin={formState[`${param.code}Min`] || ''}
                                    valueMax={formState[`${param.code}Max`] || ''}
                                    prefixMin={formState[`${param.code}PrefixMin`] || 'ge'}
                                    prefixMax={formState[`${param.code}PrefixMax`] || 'le'}
                                    onChange={(key, val) => setFormState((prev) => ({ ...prev, [key]: val }))}
                                    unitOptions={getRangeInputType(param) === 'number' ? ucumUnits : []}
                                />
                            ) : param.expression?.includes('extension') ? (
                                <ExtensionSearchInput
                                    paramCode={param.code}
                                    expression={param.expression || ''}
                                    value={formState[param.code] || ''}
                                    onChange={(vals) => setFormState((prev) => ({ ...prev, [param.code]: vals }))}
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
                                (typeMap[param.type] || typeMap.string)(
                                    param.code,
                                    formState[param.code] || '',
                                    (v) => handleChange(param.code, v)
                                )
                            )}
                        </div>
                    ))}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    className="inline-flex items-center rounded-lg bg-[#e57f25] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#cf6f1f] focus:outline-none focus:ring-2 focus:ring-[#e57f25] focus:ring-offset-2"
                >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                </button>
            </div>
        </form>
    );
};
