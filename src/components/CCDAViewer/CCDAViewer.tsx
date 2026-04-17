import { Resource } from 'fhir/r4';
import React, { useState } from 'react';
import { CCDANavSection, CCDAProps, hasTitle } from '../../types';
import { CCDAContentViewer, CCDASectionList, LoadingAndError } from './components/';
import { useCCDAProcessor } from './hooks/';

export const CCDAViewer: React.FC<CCDAProps> = ({ ccdaXml, documentType }) => {
  const { result, loading, error } = useCCDAProcessor(ccdaXml, documentType);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // If loading or error, show appropriate component
  if (loading || error) {
    return <LoadingAndError loading={loading} error={error} />;
  }

  // If no result, show loading message
  if (!result) {
    return <div className="loading">No results found</div>;
  }

  // Extract all available sections from the bundles
  const sections: CCDANavSection[] = [];

  Object.entries(result.bundles).forEach(([type, bundle]) => {
    if (bundle.entry && Array.isArray(bundle.entry)) {
      bundle.entry.forEach((entry, index) => {
        // Use the hasTitle type guard to check for title property
        const resource = entry.resource;
        const title = hasTitle(resource) ? resource.title : undefined;
        const displayTitle = title || `${type} ${index + 1}`;

        sections.push({
          title: displayTitle,
          resourceType: type,
          index
        });
      });
    }
  });

  // Handle section selection
  const handleSectionClick = (resourceType: string, index: number) => {
    setSelectedSection(`${resourceType}-${index}`);
  };

  // Get the currently selected resource
  const getSelectedResource = (): Resource | null => {
    if (!selectedSection) {
      return null;
    }

    const [resourceType, indexStr] = selectedSection.split('-');
    const index = parseInt(indexStr, 10);

    const bundle = result.bundles[resourceType];
    if (bundle && bundle.entry && bundle.entry[index]) {
      return bundle.entry[index].resource;
    }

    return null;
  };

  const selectedResource = getSelectedResource();

  return (
    <div className="flex min-h-[500px] border border-gray-200 rounded-lg overflow-hidden">
      <CCDASectionList
        sections={sections}
        selectedSection={selectedSection}
        onSectionSelect={handleSectionClick}
      />
      <CCDAContentViewer selectedResource={selectedResource} />
    </div>
  );
};
