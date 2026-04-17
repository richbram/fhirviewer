import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { executeEverythingAcrossPartitions, executeEverything, useFhirClient, searchAcrossPartitions } from '../../providers/FHIRClient';
import { formatLabel, Loader, NoResults } from '../../utils';
import { groupBundleByResourceType } from '../../utils/dateManipulation';
import FHIRSearchResults from '../FHIRSearch/FHIRSearchResults';
import PatientDetailSidebar from '../PatientDetailSidebar/PatientDetailSidebar';

import { Resource, Bundle, Observation, DiagnosticReport } from 'fhir-types';


const FHIRResourceContainer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { readResource } = useFhirClient();
    const [resource, setResource] = useState<Resource | null>(null);
    const [selectedResourceName, setSelectedResourceName] = useState<string | 'Encounter'>('Encounter');
    const [groups, setGroups] = useState<{ [type: string]: any[] }>({});
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupedResources, setGroupedResources] = useState<any>({});


    const fetchResources = async () => {
        try {
            setLoading(true);

            //const everythingResponse : Bundle = await executeEverything(id, 'nchie');
            //const observationResponse : Bundle = await searchAcrossPartitions('Observation', [{"name": "patient", "value": id}])
            //const diagnosticReportResponse : Bundle = await searchAcrossPartitions('DiagnosticReport', [{ "name": "patient", "value": id }])


            /*const fhirBundle: Bundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: [
                    ...everythingResponse.entry,
                    ...observationResponse.entry,
                    ...diagnosticReportResponse.entry
                ]
            };
            */

            //const groupedResourcesCall = groupBundleByResourceType(fhirBundle);
            const everythingResponse: Bundle = await executeEverythingAcrossPartitions(id);
            const groupedResourcesCall = groupBundleByResourceType(everythingResponse);
            console.log('groupedResourcesCall:', groupedResourcesCall);

            setGroupedResources(groupedResourcesCall);
            setResource(groupedResourcesCall['Patient']?.entry?.[0]?.resource || null);

        } catch (err) {
            setError('Failed to fetch resources');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchResources();
    }, []);


    const refreshPage = () => {
        fetchResources();
    };

    const handleSelectResource = (resource: any) => {
        if (resource.resourceType) {
            setSelectedResourceName(resource.resourceType);
        }
        setSelectedResource(resource);
    };

    // TODO:Please use LHloading and Error component
    if (loading) return <Loader />;
    if (error) return <div>{error}</div>;
    if (!resource) return <NoResults message="Resource not found" />;


    console.log('selectedResourceName:', selectedResourceName);

    return (
        <container
            margin-bottom="none"
            margin-top="none"
            content-width="fluid"
            padding-top="none"
            padding-bottom="none"
        >
            <breadcrumb-group>
                <breadcrumb
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        window.open('/', 'homePageTab');
                    }}
                >
                    Home Page
                </lh-breadcrumb>
                <breadcrumb
                    href={`/Patient/${id}`}
                >
                    Patient Details
                </lh-breadcrumb>
                <breadcrumb >
                    {selectedResourceName}
                </lh-breadcrumb>
            </lh-breadcrumb-group>

            <grid>
                {/* Sidebar Navigation */}
                <grid-item span="3" span-tablet="12">
                    <PatientDetailSidebar patient={resource} refreshPage={refreshPage} />
                </lh-grid-item>

                {/* Main Content */}
                <grid-item span="9" span-tablet="12">

                    <container theme="secondary-light" content-width="fluid">
                        <tab-group>
                            {Object.entries(groupedResources).map(([resourceType, resources], index) => (
                                <tab
                                    key={index}
                                    slot="nav"
                                    panel={`resource-${index}`}
                                >
                                    {formatLabel(resourceType)}
                                </lh-tab>
                            ))}

                            {Object.entries(groupedResources).map(([resourceType, resources], index) => (
                                <tab-panel key={index} name={`resource-${index}`}>
                                    <container
                                        content-width="fluid"
                                        theme="transparent"
                                        alignment="left"
                                        spacing="none"
                                        padding-top="none"
                                        padding-bottom="sm"
                                        gutters="none">
                                        <typography>
                                            <icon name="note-pencil" size="lg"></lh-icon>
                                            {formatLabel(resourceType)}
                                        </lh-typography>
                                    </lh-container>
                                    <FHIRSearchResults
                                        bundle={groupedResources[resourceType]}
                                        onSelectResource={handleSelectResource}
                                        followReferences={true}
                                    />
                                </lh-tab-panel>
                            ))}
                        </lh-tab-group>
                    </lh-container>

                </lh-grid-item>
            </lh-grid>

        </lh-container>
    );
};

export default FHIRResourceContainer;
