import React, { useEffect, useState } from 'react';
import { searchResource } from '../../providers/FHIRClient';
import { SearchParam } from '../../providers/FHIRClient';
interface MemberIdSearchProps {
    value: string;
    onChange: (ref: string) => void;
    referenceType?: 'Patient' | 'Subject';  // defaults to Patient
}

const MemberIdSearch: React.FC<MemberIdSearchProps> = ({
    value,
    onChange,
    referenceType = 'Patient',
}) => {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<{ id: string; name?: string } | null>(null);



    useEffect(() => {
        if (input.length < 3) {
            setResult(null);
            return;
        }

        const fetchPatient = async () => {
            try {

                const queryParam: SearchParam = [];
                queryParam.push({ name: 'identifier', value: '' + '|' + input });

                const res = await searchResource('Patient', queryParam, 'nchie')
                const bundle = await res.json();
                const entry = bundle.entry?.[0];
                if (entry?.resource?.id) {
                    const patient = entry.resource;
                    const displayName =
                        patient.name?.[0]?.text ||
                        `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim();

                    setResult({ id: patient.id, name: displayName });
                    onChange(`Patient/${patient.id}`);
                } else {
                    setResult(null);
                }
            } catch (err) {
                console.error('Member ID search failed:', err);
                setResult(null);
            }
        };

        fetchPatient();
    }, [input, onChange, referenceType]);

    return (
        <div className="flex flex-col gap-2">
            <input
                className="w-full px-4 py-2 text-sm font-normal text-gray-900 bg-white border border-gray-700/70 rounded-lg shadow-sm outline-none cursor-text"
                placeholder="Member ID"
                value={input}
                onInput={(e) => setInput(e.target.value)}
            />
            {result && (
                <div className="text-sm text-gray-600">
                    <span className="font-medium">Found:</span> {result.name || 'Unknown'} ({result.id})
                </div>
            )}
        </div>
    );
};

export default MemberIdSearch;
