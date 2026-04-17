import React from 'react';


export interface UnitOption {
    code: string;
    display: string;
}

interface RangeInputProps {
    name: string;
    type: 'number' | 'date';
    valueMin?: string;
    valueMax?: string;
    prefixMin?: string;
    prefixMax?: string;
    unit?: string;
    onChange: (key: string, value: string) => void;
    unitOptions?: UnitOption[];
}

const prefixOptions = ['ge', 'gt', 'eq', 'lt', 'le'];

const RangeInput: React.FC<RangeInputProps> = ({
    name,
    type,
    valueMin = '',
    valueMax = '',
    prefixMin = 'ge',
    prefixMax = 'le',
    unit = '',
    onChange,
    unitOptions = [],
}) => {
    // Ensure select values are never null or undefined
    const safePrefixMin = prefixMin ?? '';
    const safePrefixMax = prefixMax ?? '';
    const safeUnit = unit ?? '';
    const safeValueMin = valueMin ?? '';
    const safeValueMax = valueMax ?? '';

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex gap-2 items-center'>
                <label className='w-12 text-sm'>Min</label>
                <select
                    value={safePrefixMin}
                    onChange={(e) => onChange(`${name}PrefixMin`, e.target.value)}
                    className='w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-pointer appearance-none'
                >
                    {prefixOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <input
                    type={type}
                    value={safeValueMin}
                    onChange={(e) => onChange(`${name}Min`, e.target.value)}
                    className='w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-text'
                />
            </div>

            <div className='flex gap-2 items-center'>
                <label className='w-12 text-sm'>Max</label>
                <select
                    value={safePrefixMax}
                    onChange={(e) => onChange(`${name}PrefixMax`, e.target.value)}
                    className='w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-pointer appearance-none'
                >
                    {prefixOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <input
                    type={type}
                    value={safeValueMax}
                    onChange={(e) => onChange(`${name}Max`, e.target.value)}
                    className='w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-text'
                />
            </div>

            {type === 'number' && unitOptions.length > 0 && (
                <div className='flex gap-2 items-center'>
                    <label className='w-12 text-sm'>Unit</label>
                    <select
                        value={safeUnit}
                        onChange={(e) => onChange(`${name}Unit`, e.target.value)}
                        className='w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-pointer appearance-none'
                    >
                        <option value=''>-- Select Unit --</option>
                        {unitOptions.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                                {opt.display} ({opt.code})
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default RangeInput;
