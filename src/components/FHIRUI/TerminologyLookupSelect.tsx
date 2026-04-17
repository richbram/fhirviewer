import React, { useState, useEffect } from 'react';

interface TerminologyLookupSelectProps {
    systems: string[];            // e.g. ['http://loinc.org', 'http://hl7.org/fhir/sid/icd-10']
    value: string;
    onChange: (code: string) => void;
}

const TerminologyLookupSelect: React.FC<TerminologyLookupSelectProps> = ({
    systems,
    value,
    onChange
}) => {
    const [input, setInput] = useState('');
    const [debouncedInput, setDebouncedInput] = useState('');
    const [selectedSystem, setSelectedSystem] = useState(systems[0]);
    const [options, setOptions] = useState<{ code: string; display?: string }[]>([]);
    const [selectedDisplay, setSelectedDisplay] = useState<string | undefined>();

    const TERMINOLOGY_API = import.meta.env.VITE_TERMINOLOGY_API_BASE;

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedInput(input);
        }, 300);
        return () => clearTimeout(timeout);
    }, [input]);

    useEffect(() => {
        if (debouncedInput.length < 3 || !TERMINOLOGY_API || !selectedSystem) return;

        const fetchMatches = async () => {
            try {
                const res = await fetch(
                    `${TERMINOLOGY_API}/ValueSet/$expand?url=${encodeURIComponent(selectedSystem)}&filter=${encodeURIComponent(debouncedInput)}`
                );
                const vs = await res.json();
                const items = vs.expansion?.contains || [];
                setOptions(items.map((x: any) => ({ code: x.code, display: x.display })));
            } catch (err) {
                console.error('Terminology search failed:', err);
            }
        };

        fetchMatches();
    }, [debouncedInput, selectedSystem, TERMINOLOGY_API]);

    useEffect(() => {
        if (!value || !selectedSystem || !TERMINOLOGY_API) {
            setSelectedDisplay(undefined);
            return;
        }

        const fetchDisplay = async () => {
            try {
                const res = await fetch(
                    `${TERMINOLOGY_API}/CodeSystem/$lookup?system=${encodeURIComponent(selectedSystem)}&code=${encodeURIComponent(value)}`
                );
                const result = await res.json();
                const displayProp = result.parameter?.find((p: any) => p.name === 'display');
                setSelectedDisplay(displayProp?.valueString);
            } catch (err) {
                console.warn('Failed to lookup display:', err);
                setSelectedDisplay(undefined);
            }
        };

        fetchDisplay();
    }, [value, selectedSystem, TERMINOLOGY_API]);

    return (
        <div className="flex flex-col gap-2">
            {systems.length > 1 && (
                <select
                    className="w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-pointer appearance-none"
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                >
                    {systems.map((sys) => (
                        <option key={sys} value={sys}>
                            {sys}
                        </option>
                    ))}
                </select>
            )}

            <input
                className="w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-text"
                placeholder="Search concept..."
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
                        <option key={opt.code} value={opt.code}>
                            {opt.display || opt.code} ({opt.code})
                        </option>
                    ))}
                </select>
            )}

            {value && (
                <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Selected:</span> {selectedDisplay || ''} ({value})
                </div>
            )}
        </div>
    );
};

export default TerminologyLookupSelect;

