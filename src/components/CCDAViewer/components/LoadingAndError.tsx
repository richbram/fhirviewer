import React from 'react';

interface LoadingAndErrorProps {
    loading: boolean;
    error: string | null;
}

export const LoadingAndError: React.FC<LoadingAndErrorProps> = ({ loading, error }) => {
    if (loading) {
        return <div className="loading">Loading FHIR bundles…</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return null;
};
