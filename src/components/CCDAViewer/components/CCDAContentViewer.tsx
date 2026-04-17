import { Resource } from 'fhir/r4';
import React, { useState } from 'react';
import { hasTitle } from '../../../types';
import { FhirResourceView } from './FhirResourceView';

interface CCDAContentViewerProps {
    selectedResource: Resource | null;
}

export const CCDAContentViewer: React.FC<CCDAContentViewerProps> = ({ selectedResource }) => {
    const [showRawData, setShowRawData] = useState<boolean>(false);

    const toggleRawData = () => {
        setShowRawData(!showRawData);
    };

    if (!selectedResource) {
        return (
            <div className="flex-1 p-6 min-h-[300px]">
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                    <h2 className="text-2xl font-semibold mb-3">FHIR Resources</h2>
                    <p className="text-lg">Select a section from the left to view its details</p>
                </div>
            </div>
        );
    }

    const resourceTitle = hasTitle(selectedResource) ? selectedResource.title : undefined;

    return (
        <div className="flex-1 p-6">
            <h2 className="text-xl font-semibold mb-4">{resourceTitle || 'Section Details'}</h2>

            {showRawData ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Raw Resource Data</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(selectedResource, null, 2)}</pre>
                    <div className="mt-4">
                        <button 
                            onClick={toggleRawData}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Show Formatted View
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <FhirResourceView resource={selectedResource} />
                    <div className="mt-4">
                        <button 
                            onClick={toggleRawData}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Show Raw JSON
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
