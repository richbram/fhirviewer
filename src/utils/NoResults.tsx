import React from 'react';

interface NoResultsProps {
    message?: string;
}

/**
 * A reusable component for displaying a "no results" message
 * @param props - Component props
 * @returns React component
 */
export const NoResults: React.FC<NoResultsProps> = ({ message = 'No results yet.' }) => {
    return (
        <div className="flex flex-col items-center justify-center py-8">
            <p className="text-lg font-medium text-gray-600">{message}</p>
        </div>
    );
};
