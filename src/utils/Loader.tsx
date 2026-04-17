import React from 'react';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
}

/**
 * A reusable loader component
 * @param props - Component props
 * @returns React component
 */
export const Loader: React.FC<LoaderProps> = ({ size = 'lg', message }) => {
    const loaderSize = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    }[size];

    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className={`animate-spin rounded-full ${loaderSize} border-4 border-blue-500 border-t-transparent`}>
                <div className="w-full h-full rounded-full bg-transparent"></div>
            </div>
            {message && <p className="mt-2 text-gray-600">{message}</p>}
        </div>
    );
};
