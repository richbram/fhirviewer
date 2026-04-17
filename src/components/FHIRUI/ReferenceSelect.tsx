import React, { useState, useEffect } from 'react';

interface ReferenceSelectProps {
    targetResource: string;       // e.g., "Practitioner", "Patient"
    value: string;
    onChange: (ref: string) => void;
}

const ReferenceSelect: React.FC<ReferenceSelectProps> = ({
    targetResource,
    value,
    onChange
}) => {
    const [input, setInput] = useState('');
    const [options, setOptions] = useState<{ id: string; label: string }[]>([]);

    const FHIR_BASE_URL = import.meta.env.VITE_FHIR_BASE_URL;

    useEffect(() => {
        if (input.length < 2) return;

        const fetchMatches = async () => {
            const res = await fetch(
                `${FHIR_BASE_URL}/${targetResource}?_summary=true&name:contains=${encodeURIComponent(input)}&_count=10`,
                { headers: { Accept: 'application/fhir+json' } }
            );
            const bundle = await res.json();
            const matches = (bundle.entry || []).map((entry: any) => {
                const res = entry.resource;
                return {
                    id: res.id,
                    label: res.name?.[0]?.text || res.name?.[0]?.family || res.id
                };
            });
            setOptions(matches);
        };

        fetchMatches();
    }, [input, targetResource]);

    return (
        <div className="flex flex-col gap-1">
            <input
                className="w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-text"
                placeholder={`Search ${targetResource}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            {options.length > 0 && (
                <select
                    className="w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-pointer appearance-none"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">-- Select --</option>
                    {options.map((opt) => (
                        <option key={opt.id} value={`${targetResource}/${opt.id}`}>
                            {opt.label} ({opt.id})
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
};

export default ReferenceSelect;
