import React from 'react';
import { FHIRResourceProps } from '../../../types';

/**
 * Component for displaying FHIR resources in a more readable format
 */
export const FhirResourceView: React.FC<FHIRResourceProps> = ({ resource }) => {
    // Handle different resource types differently
    const renderResourceContent = () => {
        switch (resource.resourceType) {
            case 'Composition':
                return renderComposition();
            default:
                return renderGenericResource();
        }
    };

    // Render Composition specific data
    const renderComposition = () => {
        const res = resource as any;
        return (
            <div className="resource-content">
                <div className="resource-field">
                    <div className="field-label">Title:</div>
                    <div className="field-value">{res.title || 'No Title'}</div>
                </div>

                {res.date && (
                    <div className="resource-field">
                        <div className="field-label">Date:</div>
                        <div className="field-value">{new Date(res.date).toLocaleString()}</div>
                    </div>
                )}

                {res.code?.coding && res.code.coding.length > 0 && (
                    <div className="resource-field">
                        <div className="field-label">Coding:</div>
                        <div className="field-value">
                            <div className="coding-display">
                                {res.code.coding[0].display || 'No Display Name'}
                            </div>
                            <div className="coding-details">
                                {res.code.coding[0].system && (
                                    <span>System: {res.code.coding[0].system}</span>
                                )}
                                {res.code.coding[0].code && (
                                    <span>Code: {res.code.coding[0].code}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Extract and display text content if available */}
                {res.text?.div && (
                    <div className="resource-field">
                        <div className="field-label">Text Content:</div>
                        <div
                            className="field-value text-content"
                            dangerouslySetInnerHTML={{ __html: res.text.div }}
                        />
                    </div>
                )}
            </div>
        );
    };

    // Default renderer for any resource type
    const renderGenericResource = () => {
        const res = resource as any;

        // Extract key fields that should be displayed prominently
        const keyFields = ['id', 'status', 'effectiveDateTime', 'issued', 'category'];

        return (
            <div className="resource-content">
                {keyFields.map(field => {
                    if (!res[field]) return null;
                    return (
                        <div className="resource-field" key={field}>
                            <div className="field-label">{field}:</div>
                            <div className="field-value">
                                {typeof res[field] === 'object'
                                    ? JSON.stringify(res[field])
                                    : res[field]}
                            </div>
                        </div>
                    );
                })}

                {/* For other fields we'll just show the raw JSON */}
                <div className="resource-field">
                    <div className="field-label">All Data:</div>
                    <pre className="json-data">{JSON.stringify(res, null, 2)}</pre>
                </div>
            </div>
        );
    };

    return (
        <div className="fhir-resource-view">
            <h3 className="resource-type">{resource.resourceType}</h3>
            {renderResourceContent()}
        </div>
    );
};
