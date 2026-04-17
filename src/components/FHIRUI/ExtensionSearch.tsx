import React, { useEffect, useState } from 'react';

interface ExtensionSearchInputProps {
    paramCode: string;
    expression: string;
    value: string[];
    onChange: (values: string[]) => void;
}

const ExtensionSearchInput: React.FC<ExtensionSearchInputProps> = ({
    paramCode,
    expression,
    value,
    onChange
}) => {
    const [options, setOptions] = useState<{ code: string; display?: string }[]>([]);
console.log(paramCode, expression)
    useEffect(() => {
        const match = expression.match(/url\s*=\s*'([^']+)'/);
        const extensionUrl = match?.[1];
        if (!extensionUrl) return;

        // Load all StructureDefinitions
        const structDefs = import.meta.glob('/public/**/StructureDefinition-*.json', {
            as: 'json',
            eager: true,
        });

        let bindingValueSetUrl: string | undefined;

        for (const file of Object.values(structDefs)) {
            const sd = file as any;
            if (sd.url === extensionUrl) {
                const matchingElement = sd.snapshot?.element?.find((el: any) =>
                    el.path?.includes('value') && el.binding?.valueSet
                );

                if (matchingElement?.binding?.valueSet) {
                    bindingValueSetUrl = matchingElement.binding.valueSet;
                }

            }
        }
       if (!bindingValueSetUrl) return;

        // Load all ValueSets
        const valueSets = import.meta.glob('/public/**/ValueSet-*.json', {
            as: 'json',
            eager: true,
        });

        for (const file of Object.values(valueSets)) {
            const vs = file as any;

            if (vs.url === bindingValueSetUrl) {
                const concepts = vs.compose?.include?.flatMap((inc: any) => inc.concept || []) || [];
                setOptions(concepts);
                break;
            }
        }
    }, [expression]);

    return (
        <div>
            <div className="relative">
                <select
                    className="w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-pointer appearance-none"
                    value={value}
                    onInput={(e) => onChange((e.target as HTMLSelectElement).value)}
                >
                    <option value=""></option>
                    {options.map((opt, idx) => (
                        <option
                            key={`${opt.code}-${idx}`}
                            value={opt.code}
                            className={`px-4 py-2 text-sm ${
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

export default ExtensionSearchInput;
