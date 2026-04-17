import { Resource } from 'fhir/r4';
import { useEffect, useState } from 'react';
import { useFhirClient } from '../../providers/FHIRClient';
import { Loader, NoResults } from '../../utils';
import FHIRResource from '../FHIRResource/FHIRResource';

const ReferenceRenderer = ({
	resourceType,
	id,
	containedResources,
	followReferences,
}: {
	resourceType: string;
	id: string;
	containedResources?: Resource[];
	followReferences?: boolean;
}) => {
	const { readResource } = useFhirClient();
	const [refResource, setRefResource] = useState<Resource | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchReference = async () => {
			try {
				if (id.startsWith('#')) {
					// ✅ Handle contained resource
					const localId = id.substring(1);
					const contained = containedResources?.find(r => r.id === localId);
					if (contained) {
						setRefResource(contained);
						return;
					}
				}

				// ✅ Otherwise fetch from server
				const result = await readResource(resourceType, id) as Resource;
				setRefResource(result);
			} catch (error) {
				console.error('Failed to load reference', error);
			} finally {
				setLoading(false);
			}
		};

		if (followReferences) {
			fetchReference();
		} else {
			setLoading(false);
		}
	}, [resourceType, id, containedResources, followReferences]);

	if (!followReferences) return null;
	if (loading) return <Loader />;
	if (!refResource) return <NoResults message="Reference not found" />;

	return <FHIRResource resource={refResource} followReferences={false} />;
};
export default ReferenceRenderer
