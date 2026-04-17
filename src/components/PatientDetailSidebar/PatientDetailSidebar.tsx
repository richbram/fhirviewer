import { Patient } from 'fhir/r4';
import React from 'react';

interface PatientDetailSidebarProps {
    patient: Patient;
    refreshPage: () => void;
}

const PatientDetailSidebar: React.FC<PatientDetailSidebarProps> = ({ patient, refreshPage }) => {
    if (!patient) {
        return <div>No patient data available</div>;
    }

    const { name, gender, birthDate, telecom, address } = patient;

    const fullName = name?.[0]
        ? `${name[0].given?.join(' ')} ${name[0].family}`
        : 'Not Received';
    const email = telecom?.find((t: any) => t.system === 'email')?.value || 'Not Received';
    const phone = telecom?.find((t: any) => t.system === 'phone')?.value || 'Not Received';
    const fullAddress = address?.[0]
        ? `${address[0].line?.join(', ')}, ${address[0].city}, ${address[0].state}, ${address[0].postalCode}`
        : 'Not Received';

    const age = birthDate
        ? `${new Date().getFullYear() - new Date(birthDate).getFullYear()} years`
        : 'Not Available';

    const handleAttachDocument = () => {
        console.log('test');
    };

    return (
        <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <h2 className="text-xl font-semibold">{fullName}</h2>
            <hr className="my-4 border-slate-700" />

            <div className="space-y-3 text-sm text-slate-200">
                <p><strong className="text-white">Gender:</strong> {gender || 'Not Received'}</p>
                <p><strong className="text-white">DOB:</strong> {birthDate || 'Not Received'}</p>
                <p><strong className="text-white">Age:</strong> {age}</p>
                <p><strong className="text-white">Email:</strong> {email}</p>
                <p><strong className="text-white">Phone:</strong> {phone}</p>
                <p><strong className="text-white">Address:</strong> {fullAddress}</p>
            </div>

            <div className="mt-6 space-y-3">
                <button
                    type="button"
                    onClick={refreshPage}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                    Refresh
                </button>

                <button
                    type="button"
                    onClick={handleAttachDocument}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                    Upload Documents
                </button>
            </div>
        </div>
    );
};

export default PatientDetailSidebar;
