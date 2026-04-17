import React from 'react';
import { CCDANavSection } from '../../../types';

interface CCDASectionListProps {
    sections: CCDANavSection[];
    selectedSection: string | null;
    onSectionSelect: (resourceType: string, index: number) => void;
}

export const CCDASectionList: React.FC<CCDASectionListProps> = ({
    sections,
    selectedSection,
    onSectionSelect
}) => {
    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">CCDA Document Sections</h2>
            <ul className="space-y-1">
                {sections.map((section, idx) => (
                    <li
                        key={idx}
                        className={`px-3 py-2 rounded-lg cursor-pointer ${
                            selectedSection === `${section.resourceType}-${section.index}`
                                ? 'bg-[#093452] text-white'
                                : 'hover:bg-gray-100'
                        }`}
                        onClick={() => onSectionSelect(section.resourceType, section.index)}
                    >
                        {section.title}
                    </li>
                ))}
            </ul>
        </div>
    );
};
